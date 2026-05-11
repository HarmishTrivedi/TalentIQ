"""Matching routes: run matching, get results."""
import time
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.models import Job, MatchScore, Candidate, User
from app.models.schemas import MatchRequest, MatchResultResponse, MatchScoreResponse
from app.services.matching_service import get_matching_engine
from app.utils.auth import get_current_user

router = APIRouter(prefix="/matching", tags=["Matching"])


@router.post("/run", response_model=MatchResultResponse)
async def run_matching(
    request: MatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run AI matching — job must belong to the current user."""
    start_ms = time.time() * 1000

    result = await db.execute(
        select(Job).where(Job.id == request.job_id, Job.created_by == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    engine = get_matching_engine()
    scores = await engine.match_candidates_to_job(
        job=job,
        db=db,
        candidate_ids=request.candidate_ids,
        top_k=request.top_k,
        user_id=current_user.id,
    )

    # Load candidate data for response
    enriched = []
    for score in scores:
        cand_result = await db.execute(
            select(Candidate).where(Candidate.id == score.candidate_id)
        )
        candidate = cand_result.scalar_one_or_none()
        score_dict = MatchScoreResponse.model_validate(score)
        if candidate:
            from app.models.schemas import CandidateResponse
            score_dict.candidate = CandidateResponse.model_validate(candidate)
        enriched.append(score_dict)

    elapsed = time.time() * 1000 - start_ms

    from app.models.schemas import JobResponse
    return MatchResultResponse(
        job=JobResponse.model_validate(job),
        results=enriched,
        total_candidates=len(enriched),
        processing_time_ms=elapsed,
    )


@router.get("/job/{job_id}", response_model=MatchResultResponse)
async def get_job_matches(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get previously computed matches — job must belong to the current user."""
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.created_by == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    scores_result = await db.execute(
        select(MatchScore)
        .where(MatchScore.job_id == job_id)
        .order_by(MatchScore.overall_score.desc())
        .limit(50)
    )
    scores = scores_result.scalars().all()

    enriched = []
    for score in scores:
        cand_result = await db.execute(
            select(Candidate).where(Candidate.id == score.candidate_id)
        )
        candidate = cand_result.scalar_one_or_none()
        score_resp = MatchScoreResponse.model_validate(score)
        if candidate:
            from app.models.schemas import CandidateResponse
            score_resp.candidate = CandidateResponse.model_validate(candidate)
        enriched.append(score_resp)

    from app.models.schemas import JobResponse
    return MatchResultResponse(
        job=JobResponse.model_validate(job),
        results=enriched,
        total_candidates=len(enriched),
        processing_time_ms=0,
    )


@router.get("/candidate/{candidate_id}")
async def get_candidate_matches(
    candidate_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get all match scores for a specific candidate."""
    result = await db.execute(
        select(MatchScore)
        .where(MatchScore.candidate_id == candidate_id)
        .order_by(MatchScore.overall_score.desc())
    )
    return result.scalars().all()
