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

Generate a comprehensive, well-structured JD with these exact sections:

## About the Role
[2-3 sentences describing the role and its impact]

## Key Responsibilities
[8-10 bullet points of specific responsibilities]

## Required Qualifications
[6-8 bullet points of must-have requirements]

## Preferred Qualifications
[4-5 bullet points of nice-to-have skills]

## What We Offer
[5-6 bullet points of benefits and perks]

## About {company}
[2-3 sentences about the company culture and mission]

Make it professional, specific, engaging, and realistic. Use action verbs. Be specific about technologies and skills. Do NOT use placeholder text."""


@router.post("/generate-jd")
async def generate_jd(
    request: JDGenerateRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate a professional Job Description using AI."""
    from app.services.llm_service import get_llm_service
    llm = get_llm_service()

    prompt = JD_GENERATION_PROMPT
    prompt = prompt.replace("{role_title}", request.role_title or "Not specified")
    prompt = prompt.replace("{company}", request.company or "Our Company")
    prompt = prompt.replace("{industry}", request.industry or "Technology")
    prompt = prompt.replace("{experience_years}", request.experience_years or "Not specified")
    prompt = prompt.replace("{location}", request.location or "Remote")
    prompt = prompt.replace("{job_type}", request.job_type or "Full-time")
    prompt = prompt.replace("{key_skills}", request.key_skills or "Not specified")
    prompt = prompt.replace("{extra_notes}", request.extra_notes or "None")

    jd_text = await llm.generate(
        prompt=prompt,
        system_prompt="You are a senior HR professional and technical recruiter. Write compelling, accurate, professional job descriptions.",
        temperature=0.7,
        max_tokens=2000,
    )

    return { "jd": jd_text }


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
