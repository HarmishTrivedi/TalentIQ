"""
Job Processing Service.
Handles job description parsing and embedding generation.
"""
from typing import Optional
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Job
from app.services.llm_service import get_llm_service
from app.services.intelligence_service import get_intelligence_service
from app.vector_store.faiss_store import get_vector_store

logger = structlog.get_logger()


JOB_EXTRACTION_PROMPT = """You are an expert HR requirements analyst specializing in the {domain} domain. 
Extract structured requirements from this job description.

Job Description:
{job_description}

Domain Knowledge (Core Skills to look for): {core_skills}
Forbidden Skills (Ignore these): {forbidden_skills}

Return a JSON object with EXACTLY this structure:
{{
  "required_skills": {{
    "technical": ["Skill 1", "Skill 2"],
    "soft": ["Soft Skill 1"]
  }},
  "preferred_skills": {{
    "technical": ["Skill 3"],
    "soft": ["Soft Skill 2"]
  }},
  "required_experience_years": 3.0,
  "required_education": "Degree details",
  "salary_range": {{
    "min": 80000,
    "max": 120000,
    "currency": "USD"
  }},
  "domain": "{domain}"
}}

STRICT RULE: Only extract skills relevant to {domain}. Do not include skills from other domains (e.g., NO coding skills for Sales roles)."""


class JobService:
    def __init__(self):
        self.llm = get_llm_service()
        self.intel = get_intelligence_service()
        self.vector_store = get_vector_store()

    async def process_job(self, job: Job, db: AsyncSession) -> Job:
        """Extract requirements and generate embeddings for a job."""
        logger.info("Processing job", job_id=job.id, title=job.title)

        try:
            # 0. Classify domain if not present
            if not job.domain:
                job.domain = self.intel.classify_role(job.title)

            # 1. Extract structured requirements
            extracted = await self._extract_requirements(job.description, job.title, job.domain)

            job.required_skills = extracted.get("required_skills")
            job.preferred_skills = extracted.get("preferred_skills")
            job.required_experience_years = extracted.get("required_experience_years")
            job.required_education = extracted.get("required_education")
            job.salary_range = extracted.get("salary_range")
            if extracted.get("domain"):
                job.domain = extracted.get("domain")

            # 2. Generate embedding and store
            embedding_text = self._build_embedding_text(job)
            embedding = await self.llm.get_embedding(embedding_text)

            faiss_ids = await self.vector_store.add_documents(
                texts=[embedding_text],
                embeddings=[embedding],
                doc_id=job.id,
                metadata={"type": "job", "title": job.title},
            )
            job.faiss_doc_id = str(faiss_ids[0]) if faiss_ids else None

            await db.flush()
            logger.info("Job processing complete", job_id=job.id)

        except Exception as e:
            logger.error("Job processing failed", job_id=job.id, error=str(e))

        return job

    async def parse_jd_from_file(self, file_bytes: bytes, filename: str) -> dict:
        """Extract text from file and use LLM to parse basic job metadata."""
        from app.utils.pdf_extractor import extract_text_from_bytes
        
        try:
            text = extract_text_from_bytes(file_bytes, filename)
            if not text or len(text) < 100:
                raise ValueError("Extracted text is too short or empty")
            
            prompt = f"""You are an expert HR assistant. Extract basic job metadata from the following Job Description text.
            
JD TEXT:
{text[:4000]}

Return a JSON object with EXACTLY this structure:
{{
  "title": "Job Title",
  "company": "Company Name (or null)",
  "location": "Location (or null)",
  "job_type": "full-time, part-time, contract, freelance, or internship",
  "required_experience_years": 3.5 (float or null),
  "domain": "Detected domain (e.g. Technology, Healthcare, Sales)"
}}
"""
            metadata = await self.llm.generate_json(
                prompt=prompt,
                system_prompt="You are a precise HR data extractor. Only return JSON."
            )
            
            # Ensure description is included
            metadata["description"] = text
            return metadata
            
        except Exception as e:
            logger.error("Failed to parse JD from file", filename=filename, error=str(e))
            raise e

    async def _extract_requirements(self, description: str, title: str, domain: str) -> dict:
        try:
            intel = self.intel.get_role_intelligence(title)
            prompt = JOB_EXTRACTION_PROMPT.format(
                job_description=description[:3000],
                domain=domain,
                core_skills=", ".join(intel['core_skills']),
                forbidden_skills=", ".join(intel['forbidden_skills'])
            )
            return await self.llm.generate_json(
                prompt=prompt,
                system_prompt=f"You are an expert {domain} HR analyst.",
            )
        except Exception as e:
            logger.error("Job requirements extraction failed", error=str(e))
            return {}

    def _build_embedding_text(self, job: Job) -> str:
        parts = [f"Job: {job.title}"]
        if job.company:
            parts.append(f"Company: {job.company}")
        parts.append(f"Description: {job.description[:2000]}")

        req_skills = job.required_skills or {}
        all_skills = []
        for s_list in req_skills.values():
            if isinstance(s_list, list):
                all_skills.extend(s_list)
        if all_skills:
            parts.append(f"Skills: {', '.join(all_skills)}")

        if job.required_experience_years:
            parts.append(f"Experience: {job.required_experience_years} years")

        return "\n".join(parts)


_job_service: Optional[JobService] = None


def get_job_service() -> JobService:
    global _job_service
    if _job_service is None:
        _job_service = JobService()
    return _job_service
