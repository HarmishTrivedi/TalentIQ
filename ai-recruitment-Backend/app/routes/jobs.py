"""Job management routes: create, list, get, update, delete — scoped per user."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.models import Job, User
from app.models.schemas import JobCreate, JobUpdate, JobResponse, JobListResponse
from app.services.job_service import get_job_service
from app.utils.auth import get_current_user

router = APIRouter(prefix="/jobs", tags=["Jobs"])


class JDGenerateRequest(BaseModel):
    role_title: str
    company: Optional[str] = None
    industry: Optional[str] = None
    experience_years: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    key_skills: Optional[str] = None
    extra_notes: Optional[str] = None


JD_GENERATION_PROMPT = """You are an expert technical recruiter and HR professional. Generate a complete, professional Job Description (JD) for the following role.

ROLE DETAILS:
- Job Title: {role_title}
- Company: {company}
- Industry: {industry}
- Experience Required: {experience_years}
- Location: {location}
- Job Type: {job_type}
- Key Skills: {key_skills}
- Additional Notes: {extra_notes}

Generate a comprehensive, well-structured JD in MARKDOWN format with these exact sections:

# {role_title}

**Company:** {company}  
**Location:** {location}  
**Job Type:** {job_type}  
**Experience:** {experience_years}  

---

## About the Role

[Write 2-3 compelling sentences describing the role, its impact, and why it's exciting. Be specific about what the person will do and achieve.]

---

## Key Responsibilities

- [Specific responsibility with action verb - be detailed]
- [Another key responsibility - mention technologies/tools]
- [Responsibility related to team collaboration]
- [Responsibility about project ownership]
- [Responsibility about technical decisions]
- [Responsibility about code quality/best practices]
- [Responsibility about mentoring or leadership]
- [Responsibility about stakeholder communication]
- [Additional responsibility if relevant]
- [Final key responsibility]

---

## Required Qualifications

- [Specific years of experience with technology/domain]
- [Specific technical skill or framework - be precise]
- [Another must-have technical skill]
- [Soft skill or methodology requirement]
- [Educational requirement or equivalent experience]
- [Communication or collaboration requirement]
- [Problem-solving or analytical skill]
- [Additional must-have qualification]

---

## Preferred Qualifications

- [Nice-to-have technical skill or certification]
- [Experience with specific tools or platforms]
- [Additional programming language or framework]
- [Industry-specific knowledge]
- [Leadership or mentoring experience]

---

## What We Offer

- 💰 Competitive salary and equity/stock options
- 🏥 Flexible work arrangements (remote/hybrid options)
- 📚 Professional development and learning budget
- 🏋️ Health, dental, and wellness benefits
- 🌴 Generous PTO and work-life balance
- 🚀 Opportunity to work on cutting-edge technology

---

## About {company}

[Write 2-3 sentences about the company's mission, culture, values, and what makes it a great place to work. Be authentic and specific.]

---

**How to Apply:**  
Interested candidates should submit their resume and portfolio through our careers portal.

*{company} is an equal opportunity employer. We celebrate diversity and are committed to creating an inclusive environment for all employees.*

---

IMPORTANT INSTRUCTIONS:
- Use REAL, SPECIFIC details - NO placeholder text like "[Company Name]" or "[Technology]"
- Mention actual technologies, frameworks, and tools relevant to {role_title}
- Be professional but engaging
- Use action verbs (Lead, Design, Implement, Collaborate, etc.)
- Make responsibilities and qualifications realistic and achievable
- Ensure the JD is ready to post immediately without any editing
- Format everything in clean Markdown
"""


@router.post("/generate-jd")
async def generate_jd(
    request: JDGenerateRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate a professional Job Description using AI with perfect formatting."""
    from app.services.llm_service import get_llm_service
    llm = get_llm_service()

    prompt = JD_GENERATION_PROMPT
    prompt = prompt.replace("{role_title}", request.role_title or "Software Engineer")
    prompt = prompt.replace("{company}", request.company or "TechCorp")
    prompt = prompt.replace("{industry}", request.industry or "Technology")
    prompt = prompt.replace("{experience_years}", request.experience_years or "3-5 years")
    prompt = prompt.replace("{location}", request.location or "Remote")
    prompt = prompt.replace("{job_type}", request.job_type or "Full-time")
    prompt = prompt.replace("{key_skills}", request.key_skills or "Programming, Problem Solving")
    prompt = prompt.replace("{extra_notes}", request.extra_notes or "None")

    jd_text = await llm.generate(
        prompt=prompt,
        system_prompt="You are a senior HR professional and technical recruiter with 15+ years of experience. Write compelling, accurate, professional job descriptions in perfect Markdown format. Be specific, realistic, and engaging. Never use placeholder text.",
        temperature=0.7,
        max_tokens=2500,
    )

    return {
        "jd": jd_text,
        "formatted": True,
        "role_title": request.role_title,
        "company": request.company or "TechCorp",
        "location": request.location or "Remote",
        "job_type": request.job_type or "Full-time"
    }


@router.post("", response_model=JobResponse, status_code=201)
async def create_job(
    job_data: JobCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new job — always linked to the logged-in user."""
    job = Job(
        title=job_data.title,
        company=job_data.company,
        location=job_data.location,
        job_type=job_data.job_type,
        description=job_data.description,
        required_experience_years=job_data.required_experience_years,
        created_by=current_user.id,
    )
    db.add(job)
    await db.flush()

    job_service = get_job_service()
    job = await job_service.process_job(job, db)
    return job


@router.get("", response_model=JobListResponse)
async def list_jobs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str = Query(default=None),
    status: str = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List only the jobs created by the current user."""
    query = select(Job).where(Job.created_by == current_user.id)

    if search:
        query = query.where(
            Job.title.ilike(f"%{search}%") | Job.company.ilike(f"%{search}%")
        )
    if status:
        query = query.where(Job.status == status)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    query = query.order_by(Job.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    jobs = result.scalars().all()

    return JobListResponse(jobs=jobs, total=total)


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a job — only if it belongs to the current user."""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.created_by == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: str,
    job_data: JobUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a job — only if it belongs to the current user."""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.created_by == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    for field, value in job_data.model_dump(exclude_none=True).items():
        setattr(job, field, value)

    if job_data.description:
        job_service = get_job_service()
        job = await job_service.process_job(job, db)

    await db.flush()
    return job


@router.delete("/{job_id}", status_code=204)
async def delete_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a job — only if it belongs to the current user."""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.created_by == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    from app.vector_store.faiss_store import get_vector_store
    await get_vector_store().delete_document(job_id)
    await db.delete(job)
