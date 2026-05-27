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


@router.post("/generate-jd")
async def generate_jd(
    request: JDGenerateRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate a professional Job Description using AI with domain-specific intelligence."""
    from app.services.llm_service import get_llm_service
    from app.services.intelligence_service import get_intelligence_service
    
    llm = get_llm_service()
    intel_service = get_intelligence_service()

    # Step 1: Classify Role into Domain
    intel = intel_service.get_role_intelligence(request.role_title)
    domain = intel['domain']
    core_skills = ", ".join(intel['core_skills'])
    forbidden_skills = ", ".join(intel['forbidden_skills'])
    base_responsibilities = "\n".join([f"- {r}" for r in intel['responsibilities']])

    # Step 3: Controlled JD Generation
    prompt = f"""You are an expert technical recruiter and HR professional specializing in the {domain} domain. 
Generate a complete, professional Job Description (JD) for the role of {request.role_title}.

ROLE DETAILS:
- Job Title: {request.role_title}
- Company: {request.company or "TechCorp"}
- Industry: {request.industry or domain}
- Domain: {domain}
- Experience Required: {request.experience_years or "3-5 years"}
- Location: {request.location or "Remote"}
- Job Type: {request.job_type or "Full-time"}
- Key Skills provided by user: {request.key_skills or "None"}
- Additional Notes: {request.extra_notes or "None"}

DOMAIN CONSTRAINTS:
- YOU MUST include these Core Skills: {core_skills}
- YOU MUST NOT include any of these Forbidden Skills: {forbidden_skills}
- Ensure responsibilities are relevant to {domain}.

Generate a comprehensive, well-structured JD in MARKDOWN format with these exact sections:

# {request.role_title}

**Company:** {request.company or "TechCorp"}  
**Location:** {request.location or "Remote"}  
**Job Type:** {request.job_type or "Full-time"}  
**Experience:** {request.experience_years or "3-5 years"}  

---

## About the Role
[Write 2-3 compelling sentences describing the role within the {domain} context.]

---

## Key Responsibilities
{base_responsibilities}
[Add 3-5 more specific responsibilities for this specific role]

---

## Required Qualifications
- [Specific years of experience with {domain} technologies/processes]
- [Core Skill from: {core_skills}]
- [Another core skill or domain-specific requirement]
- [Soft skill or methodology requirement]
- [Educational requirement]

---

## Preferred Qualifications
- [Nice-to-have skill from: {', '.join(intel['preferred_skills'][:5])}]
- [Industry-specific knowledge]

---

## What We Offer
- 💰 Competitive salary and benefits
- 🚀 Growth opportunities

---

## About {request.company or "TechCorp"}
[Mission and culture description]

---

**IMPORTANT:** Stay strictly within the {domain} domain. NEVER add software engineering skills (like Python, Kubernetes) to non-technical roles like Sales or HR.
"""

    jd_text = await llm.generate(
        prompt=prompt,
        system_prompt=f"You are a senior {domain} recruiter with 15+ years of experience. Write accurate, professional job descriptions. Never hallucinate unrelated technical skills.",
        temperature=0.5,
    )

    # Step 4: AI Validation Layer
    validated_jd = await intel_service.validate_jd(request.role_title, jd_text)

    return {
        "jd": validated_jd,
        "formatted": True,
        "role_title": request.role_title,
        "domain": domain,
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
