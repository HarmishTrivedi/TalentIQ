"""
CV Processing Service.
Handles: text extraction, structured parsing, embedding generation.
"""
import os
import re
import asyncio
from pathlib import Path
from typing import Optional
from datetime import datetime
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import Candidate, CandidateStatus
from app.services.llm_service import get_llm_service
from app.services.intelligence_service import get_intelligence_service
from app.vector_store.faiss_store import get_vector_store
from app.utils.pdf_extractor import extract_text_from_bytes, chunk_text
from app.config import settings

logger = structlog.get_logger()


CV_EXTRACTION_PROMPT = """You are an expert CV/Resume parser. Today's date is {today}. Extract structured information from the following resume text.

Resume Text:
{cv_text}

Extract and return a JSON object with EXACTLY this structure:
{{
  "name": "Full name of the candidate",
  "email": "email@example.com or null",
  "phone": "phone number or null",
  "location": "city, country or null",
  "summary": "2-3 sentence professional summary",
  "domain": "Detected domain (e.g. Software Engineering, Data & AI, Enterprise Systems, Sales, etc.)",
  "experience_years": 0.0,
  "experience_details": {{
    "positions": [
      {{
        "title": "Job Title",
        "company": "Company Name",
        "duration": "Jan 2020 - Present",
        "description": "Key responsibilities and achievements"
      }}
    ]
  }},
  "skills": {{
    "technical": ["Python", "React", "SQL"],
    "soft": ["Leadership", "Communication"],
    "tools": ["Git", "Docker", "AWS"],
    "frameworks": ["FastAPI", "Django", "React"]
  }},
  "education": {{
    "degrees": [
      {{
        "degree": "B.Sc Computer Science",
        "institution": "University Name",
        "year": "2018",
        "field": "Computer Science"
      }}
    ],
    "highest_level": "bachelor"
  }},
  "projects": [
    {{
      "name": "Project Name",
      "description": "Brief description of what was built and tools used",
      "link": "URL if available or null"
    }}
  ],
  "certifications": ["AWS Certified Developer", "PMP"],
  "languages": ["English", "Spanish"]
}}

CRITICAL RULES for experience_details.positions:
- Extract ONLY work/job positions from the Experience or Work History section
- Do NOT include education, projects, or certifications as positions
- For "duration", copy the EXACT date range as written in the CV (e.g. "Jan 2025 - April 2025", "Feb 2026 - Present")
- If a date says "Present" or "Current", keep it as-is — do not replace with today's date
- Set experience_years to 0.0 — it will be calculated programmatically

Be precise and accurate. If information is not available, use null or empty arrays."""


MONTH_MAP = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
    'january': 1, 'february': 2, 'march': 3, 'april': 4, 'june': 6,
    'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
}


def _parse_date(s: str):
    s = s.strip().lower()
    if s in ('present', 'current', 'now', 'till date', 'till now', 'ongoing', 'today'):
        n = datetime.now()
        return (n.year, n.month)
    m = re.match(r'([a-z]+)\.?\s*(\d{4})', s)
    if m:
        mon = MONTH_MAP.get(m.group(1)[:3])
        if mon:
            return (int(m.group(2)), mon)
    m = re.match(r'^(\d{4})$', s.strip())
    if m:
        return (int(m.group(1)), 1)
    m = re.match(r'(\d{4})[\-/](\d{1,2})', s)
    if m:
        return (int(m.group(1)), int(m.group(2)))
    m = re.match(r'(\d{1,2})[/\-](\d{4})', s)
    if m:
        return (int(m.group(2)), int(m.group(1)))
    return None


def _merge_and_sum(ranges: list) -> int:
    if not ranges:
        return 0
    ranges.sort()
    merged = [list(ranges[0])]
    for s, e in ranges[1:]:
        if s <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])
    return sum(e - s for s, e in merged)


def calculate_experience_from_positions(positions: list) -> float:
    """
    Parse duration strings from LLM-extracted positions and sum unique months.
    Today's date is computed at runtime so 'Present' is always accurate.
    Returns total experience as float years (e.g. 0.25 = 3 months).
    """
    def to_m(ym): return ym[0] * 12 + ym[1]
    now = datetime.now()
    now_m = now.year * 12 + now.month

    ranges = []
    for pos in positions:
        duration = (pos.get('duration') or '').strip()
        if not duration:
            continue
        parts = re.split(r'\s*[\u2013\-]\s*|\s+to\s+', duration, maxsplit=1)
        if len(parts) == 2:
            s, e = _parse_date(parts[0]), _parse_date(parts[1])
            if s and e:
                sm, em = to_m(s), to_m(e)
                if sm > now_m:
                    continue  # future start — skip entirely
                em = min(em, now_m)  # cap end to today
                if em > sm:
                    ranges.append((sm, em))
        elif len(parts) == 1:
            d = _parse_date(parts[0])
            if d:
                sm = to_m(d)
                if sm <= now_m:
                    ranges.append((sm, min(sm + 11, now_m)))

    total_months = _merge_and_sum(ranges)
    logger.info("Experience calculated", total_months=total_months, positions=len(positions))
    # Store as fractional years but keep precision for display (e.g. 3 months = 0.25)
    return round(total_months / 12, 4) if total_months else 0.0


def calculate_experience_from_raw_text(raw_text: str) -> float:
    """
    DISABLED — raw text scan picks up education/project years and gives wrong results.
    Use calculate_experience_from_positions() on LLM-extracted positions instead.
    """
    return 0.0


class CVProcessingService:
    """
    End-to-end CV processing pipeline.
    Extracts text → parses structure → generates embeddings → stores in FAISS.
    """

    def __init__(self):
        self.llm = get_llm_service()
        self.intel = get_intelligence_service()
        self.vector_store = get_vector_store()
        self.upload_dir = Path(settings.upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def process_cv(
        self,
        file_bytes: bytes,
        filename: str,
        db: AsyncSession,
        user_id: Optional[str] = None,
    ) -> Candidate:
        """Full CV processing pipeline."""
        logger.info("Starting CV processing", filename=filename, user_id=user_id)

        # 1. Save file to disk
        file_path = await self._save_file(file_bytes, filename)

        # 2. Create candidate record (processing state)
        candidate = Candidate(
            name=Path(filename).stem,  # temp name
            cv_filename=filename,
            cv_file_path=str(file_path),
            status=CandidateStatus.processing,
            uploaded_by=user_id,
        )
        db.add(candidate)
        await db.flush()  # Get the ID

        raw_text = ""
        try:
            # 3. Extract text
            try:
                raw_text = extract_text_from_bytes(file_bytes, filename)
                candidate.cv_raw_text = raw_text
            except Exception as ext_err:
                logger.error("Text extraction failed", error=str(ext_err))
                raw_text = f"Text extraction failed for {filename}. Manual review required."
                candidate.cv_raw_text = raw_text

            # 4. Parse structured data with LLM
            structured = await self._extract_structured_data(raw_text)

            # 5. Update candidate with extracted data
            candidate.name = structured.get("name") or Path(filename).stem
            candidate.email = structured.get("email")
            candidate.phone = structured.get("phone")
            candidate.location = structured.get("location")
            candidate.summary = structured.get("summary")
            
            # Step 1: Deep Domain Classification
            # Use LLM to study the candidate profile thoroughly
            positions = structured.get("experience_details", {}).get("positions", [])
            current_role = positions[0].get("title") if positions else candidate.name
            
            # Extract skills string for classification
            cand_skills_raw = structured.get("skills", {})
            skills_str = ""
            if isinstance(cand_skills_raw, dict):
                skills_str = ", ".join([str(s) for sublist in cand_skills_raw.values() if isinstance(sublist, list) for s in sublist])
            elif isinstance(cand_skills_raw, list):
                skills_str = ", ".join([str(s) for s in cand_skills_raw])
                
            candidate.domain = await self.intel.classify_role_deep(
                role_title=current_role,
                summary=candidate.summary or "",
                skills=skills_str
            )

            candidate.experience_details = structured.get("experience_details", {"positions": []})
            # Use ONLY LLM-extracted positions for experience calculation.
            # Raw text scan is disabled because it picks up education/project dates.
            positions = candidate.experience_details.get("positions", [])
            candidate.experience_years = (
                calculate_experience_from_positions(positions)
                or structured.get("experience_years")
                or 0.0
            )
            
            # Robust skills handling (handle dict or list)
            extracted_skills = structured.get("skills", {})
            if isinstance(extracted_skills, list):
                candidate.skills = {
                    "technical": extracted_skills,
                    "soft": [],
                    "tools": [],
                    "frameworks": []
                }
            else:
                candidate.skills = extracted_skills

            candidate.education = structured.get("education", {"degrees": []})
            candidate.certifications = structured.get("certifications", [])
            candidate.projects = structured.get("projects", [])
            candidate.languages = structured.get("languages", [])

            # 6. Generate embeddings and store in FAISS
            try:
                faiss_ids = await self._index_candidate(candidate, raw_text)
                candidate.faiss_doc_ids = faiss_ids
            except Exception as faiss_err:
                logger.error("FAISS indexing failed", error=str(faiss_err))
                candidate.faiss_doc_ids = []

            candidate.status = CandidateStatus.ready
            logger.info("CV processing complete", candidate_id=candidate.id, name=candidate.name)
            
            # 7. Send email notifications
            await self._send_email_notifications(candidate, user_id, db)

        except Exception as e:
            candidate.status = CandidateStatus.error
            candidate.processing_error = str(e)
            logger.error("CV processing failed", error=str(e), candidate_id=candidate.id)
            # Use fallback even on error to have something
            try:
                fallback = self._fallback_extract(raw_text)
                candidate.name = fallback.get("name", candidate.name)
                candidate.email = fallback.get("email")
                candidate.phone = fallback.get("phone")
                candidate.summary = fallback.get("summary")
                candidate.experience_years = fallback.get("experience_years")
                candidate.skills = fallback.get("skills")
                candidate.status = CandidateStatus.ready
            except Exception as fb_err:
                logger.error("Fallback extraction failed", error=str(fb_err))


        await db.flush()
        return candidate
    
    async def _send_email_notifications(self, candidate: Candidate, user_id: Optional[str], db: AsyncSession):
        """Send email notifications to candidate and recruiter"""
        try:
            from app.services.email_service import get_email_service
            from app.models.models import User
            from sqlalchemy import select
            
            email_service = get_email_service()
            
            # Extract skills list for email
            skills_list = []
            if candidate.skills:
                if isinstance(candidate.skills, dict):
                    skills_list = (
                        candidate.skills.get("technical", []) +
                        candidate.skills.get("frameworks", []) +
                        candidate.skills.get("tools", [])
                    )
                elif isinstance(candidate.skills, list):
                    skills_list = candidate.skills
            
            # Send confirmation to candidate if email exists
            if candidate.email:
                try:
                    email_service.send_candidate_application_confirmation(
                        candidate_email=candidate.email,
                        candidate_name=candidate.name,
                        skills=skills_list,
                        experience_years=candidate.experience_years or 0.0
                    )
                    logger.info("Candidate confirmation email sent", candidate_email=candidate.email)
                except Exception as e:
                    logger.error("Failed to send candidate email", error=str(e))
            
            # Send notification to recruiter if user_id exists
            if user_id:
                try:
                    result = await db.execute(select(User).where(User.id == user_id))
                    recruiter = result.scalar_one_or_none()
                    
                    if recruiter and recruiter.email:
                        email_service.send_recruiter_new_candidate_notification(
                            recruiter_email=recruiter.email,
                            recruiter_name=recruiter.full_name,
                            candidate_name=candidate.name,
                            candidate_email=candidate.email or "Not provided",
                            skills=skills_list,
                            experience_years=candidate.experience_years or 0.0,
                            summary=candidate.summary
                        )
                        logger.info("Recruiter notification email sent", recruiter_email=recruiter.email)
                except Exception as e:
                    logger.error("Failed to send recruiter email", error=str(e))
        
        except Exception as e:
            logger.error("Email notification failed", error=str(e))
            # Don't fail the entire process if email fails

    async def _save_file(self, file_bytes: bytes, filename: str) -> Path:
        """Save uploaded file to disk."""
        import uuid
        safe_name = f"{uuid.uuid4()}_{filename}"
        file_path = self.upload_dir / safe_name

        with open(file_path, "wb") as f:
            f.write(file_bytes)

        return file_path

    async def _extract_structured_data(self, raw_text: str) -> dict:
        """Use LLM to extract structured data from CV text."""
        text = raw_text[:7000]
        today = datetime.now().strftime("%B %Y")  # e.g. "July 2025"
        prompt = CV_EXTRACTION_PROMPT.replace("{cv_text}", text).replace("{today}", today)

        try:
            return await self.llm.generate_json(
                prompt=prompt,
                system_prompt="You are a senior technical recruiter and data analyst. Extract precise structured data from the resume.",
            )
        except Exception as e:
            logger.error("Structured extraction failed", error=str(e))
            return self._fallback_extract(raw_text)

    async def _index_candidate(self, candidate: Candidate, raw_text: str) -> list[int]:
        """Chunk text and store embeddings in FAISS."""
        # Create rich text representation for embedding
        embedding_text = self._build_embedding_text(candidate, raw_text)

        # Chunk the text
        chunks = chunk_text(embedding_text, chunk_size=400, overlap=80)

        if not chunks:
            return []

        # Generate embeddings
        embeddings = await self.llm.get_embeddings_batch(chunks)

        # Store in FAISS
        faiss_ids = await self.vector_store.add_documents(
            texts=chunks,
            embeddings=embeddings,
            doc_id=candidate.id,
            metadata={
                "type": "candidate",
                "name": candidate.name,
                "skills": str(candidate.skills), # Ensure string for metadata
                "experience_years": candidate.experience_years,
            },
        )

        return faiss_ids

    def _build_embedding_text(self, candidate: Candidate, raw_text: str) -> str:
        """Build enriched text for better embeddings."""
        parts = []

        if candidate.summary:
            parts.append(f"Summary: {candidate.summary}")

        if candidate.skills and isinstance(candidate.skills, dict):
            skills = candidate.skills
            all_skills = (
                skills.get("technical", []) +
                skills.get("frameworks", []) +
                skills.get("tools", [])
            )
            if all_skills:
                parts.append(f"Technical Skills: {', '.join(all_skills)}")
            if skills.get("soft"):
                parts.append(f"Soft Skills: {', '.join(skills['soft'])}")
        elif candidate.skills and isinstance(candidate.skills, list):
             parts.append(f"Skills: {', '.join(candidate.skills)}")

        if candidate.experience_years:
            parts.append(f"Years of Experience: {candidate.experience_years}")

        if candidate.experience_details and isinstance(candidate.experience_details, dict):
            positions = candidate.experience_details.get("positions", [])
            for pos in positions[:3]:
                parts.append(
                    f"Role: {pos.get('title', '')} at {pos.get('company', '')} "
                    f"({pos.get('duration', '')}). {pos.get('description', '')}"
                )

        if candidate.education and isinstance(candidate.education, dict):
            degrees = candidate.education.get("degrees", [])
            for deg in degrees:
                parts.append(
                    f"Education: {deg.get('degree', '')} from {deg.get('institution', '')}"
                )

        # Add raw text at the end
        parts.append(raw_text[:2000])

        return "\n\n".join(parts)

    def _fallback_extract(self, raw_text: str) -> dict:
        """Regex-based fallback with improved skills extraction."""
        import re
        lines = [l.strip() for l in raw_text.split('\n') if l.strip()]

        # Name: first non-empty line that looks like a name
        name = "Unknown Candidate"
        for line in lines[:5]:
            if re.match(r'^[A-Z][a-zA-Z .\-]{3,50}$', line) and len(line.split()) >= 2:
                name = line.strip()
                break

        # Email
        email_match = re.search(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}', raw_text)
        email = email_match.group() if email_match else None

        # Phone
        phone_match = re.search(r'[\+]?[\d][\d\s\-().]{8,15}[\d]', raw_text)
        phone = phone_match.group().strip() if phone_match else None

        # Experience years - improved regex
        experience_years = 0.0
        # Look for "X+ years", "X years", etc.
        exp_matches = re.findall(r'(\d+\.?\d*)\s*(?:\+)?\s*years?', raw_text, re.IGNORECASE)
        if exp_matches:
            # Take the highest number that looks like years of experience
            try:
                nums = [float(n) for n in exp_matches if float(n) < 50]
                if nums:
                    experience_years = max(nums)
            except:
                pass
        
        # If still 0, look for "Experience: X years"
        if experience_years == 0:
            exp_match = re.search(r'experience[:\s]+(\d+\.?\d*)', raw_text, re.IGNORECASE)
            if exp_match:
                experience_years = float(exp_match.group(1))

        # Basic Skills Fallback
        technical_skills = []
        skills_keywords = [
            "Python", "Java", "JavaScript", "React", "Angular", "Vue", "Node", "TypeScript", 
            "SQL", "Postgres", "MongoDB", "AWS", "Azure", "Docker", "Git", "HTML", "CSS",
            "PHP", "C#", "C++", "Go", "Rust", "Swift", "Kotlin", "Flutter", "Dart"
        ]
        for skill in skills_keywords:
            if re.search(rf'\b{skill}\b', raw_text, re.IGNORECASE):
                technical_skills.append(skill)

        logger.info("Fallback extraction used", name=name, email=email, skills_count=len(technical_skills))
        
        # Summary: Use first 2 lines after name if possible
        summary = ""
        if len(lines) > 2:
            summary = " ".join(lines[1:3])
        elif len(lines) > 1:
            summary = lines[1]

        return {
            "name": name,
            "email": email,
            "phone": phone,
            "location": None,
            "summary": summary,
            "experience_years": float(experience_years),
            "experience_details": {"positions": []},
            "skills": {"technical": technical_skills, "soft": [], "tools": [], "frameworks": []},
            "education": {"degrees": [], "highest_level": None},
            "certifications": [],
            "languages": [],
        }


    async def reprocess_candidate(self, candidate_id: str, db: AsyncSession) -> Candidate:
        """Reprocess an existing candidate's CV."""
        result = await db.execute(
            select(Candidate).where(Candidate.id == candidate_id)
        )
        candidate = result.scalar_one_or_none()
        if not candidate:
            raise ValueError(f"Candidate {candidate_id} not found")

        file_path = Path(candidate.cv_file_path)
        if not file_path.exists():
            raise ValueError(f"CV file not found: {candidate.cv_file_path}")

        with open(file_path, "rb") as f:
            file_bytes = f.read()

        # Delete old FAISS entry
        await self.vector_store.delete_document(candidate_id)

        # Reprocess
        raw_text = extract_text_from_bytes(file_bytes, candidate.cv_filename)
        candidate.cv_raw_text = raw_text
        structured = await self._extract_structured_data(raw_text)

        candidate.name = structured.get("name", candidate.name)
        candidate.email = structured.get("email", candidate.email)
        candidate.skills = structured.get("skills")
        candidate.summary = structured.get("summary")
        
        # Deep Domain Classification during reprocessing
        positions = (structured.get("experience_details") or {}).get("positions", [])
        current_role = positions[0].get("title") if positions else candidate.name
        
        cand_skills_raw = candidate.skills or {}
        skills_str = ""
        if isinstance(cand_skills_raw, dict):
            skills_str = ", ".join([str(s) for sublist in cand_skills_raw.values() if isinstance(sublist, list) for s in sublist])
        elif isinstance(cand_skills_raw, list):
            skills_str = ", ".join([str(s) for s in cand_skills_raw])

        candidate.domain = await self.intel.classify_role_deep(
            role_title=current_role,
            summary=candidate.summary or "",
            skills=skills_str
        )

        candidate.experience_details = structured.get("experience_details")
        positions = (candidate.experience_details or {}).get("positions", [])
        candidate.experience_years = (
            calculate_experience_from_positions(positions)
            or structured.get("experience_years")
            or 0.0
        )
        candidate.education = structured.get("education")
        candidate.certifications = structured.get("certifications", [])
        candidate.projects = structured.get("projects", [])
        candidate.status = CandidateStatus.ready

        faiss_ids = await self._index_candidate(candidate, raw_text)
        candidate.faiss_doc_ids = faiss_ids

        await db.flush()
        return candidate
