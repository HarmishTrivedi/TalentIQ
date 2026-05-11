"""
Job Processing Service.
Handles job description parsing and embedding generation.
"""
from typing import Optional
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Job
from app.services.llm_service import get_llm_service
from app.vector_store.faiss_store import get_vector_store

logger = structlog.get_logger()


JOB_EXTRACTION_PROMPT = """You are an expert HR requirements analyst. Extract structured requirements from this job description.

Job Description:
{job_description}

Return a JSON object with EXACTLY this structure:
{{
  "required_skills": {{
    "technical": ["Python", "React", "SQL"],
    "frameworks": ["FastAPI", "Django"],
    "tools": ["Git", "Docker", "AWS"],
    "soft": ["Communication", "Leadership"]
  }},
  "preferred_skills": {{
    "technical": ["Kubernetes", "Terraform"],
    "certifications": ["AWS Certified"],
    "soft": ["Mentoring"]
  }},
  "required_experience_years": 3.0,
  "required_education": "Bachelor's degree in Computer Science or related field",
  "salary_range": {{
    "min": 80000,
    "max": 120000,
    "currency": "USD"
  }},
  "key_responsibilities": ["Design and implement APIs", "Lead code reviews"],
  "nice_to_have": ["Experience with microservices", "Open source contributions"]
}}

If salary or certain fields are not mentioned, use null."""


class JobService:
    def __init__(self):
        self.llm = get_llm_service()
        self.vector_store = get_vector_store()

    async def process_job(self, job: Job, db: AsyncSession) -> Job:
        """Extract requirements and generate embeddings for a job."""
        logger.info("Processing job", job_id=job.id, title=job.title)

        try:
            # 1. Extract structured requirements
            extracted = await self._extract_requirements(job.description)

            job.required_skills = extracted.get("required_skills")
            job.preferred_skills = extracted.get("preferred_skills")
            job.required_experience_years = extracted.get("required_experience_years")
            job.required_education = extracted.get("required_education")
            job.salary_range = extracted.get("salary_range")

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

    async def _extract_requirements(self, description: str) -> dict:
        try:
            prompt = JOB_EXTRACTION_PROMPT.format(job_description=description[:3000])
            return await self.llm.generate_json(
                prompt=prompt,
                system_prompt="You are an expert HR requirements analyst.",
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
