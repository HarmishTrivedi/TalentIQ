"""Dashboard stats route — scoped to the current user."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.models import Candidate, Job, MatchScore, CandidateStatus, JobStatus, User
from app.models.schemas import DashboardStats
from app.utils.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get dashboard statistics scoped to the current user's jobs."""

    # Total candidates — scoped to current user's uploads
    total_candidates = (await db.execute(
        select(func.count(Candidate.id)).where(Candidate.uploaded_by == current_user.id)
    )).scalar()

    # Jobs — only this user's
    total_jobs = (await db.execute(
        select(func.count(Job.id)).where(Job.created_by == current_user.id)
    )).scalar()

    # Matches — only for this user's jobs
    total_matches = (await db.execute(
        select(func.count(MatchScore.id))
        .join(Job, MatchScore.job_id == Job.id)
        .where(Job.created_by == current_user.id)
    )).scalar()

    # Avg score — only for this user's jobs
    avg_score_result = await db.execute(
        select(func.avg(MatchScore.overall_score))
        .join(Job, MatchScore.job_id == Job.id)
        .where(Job.created_by == current_user.id)
    )
    avg_score = round(float(avg_score_result.scalar() or 0), 1)

    # Top candidates — from this user's matches
    top_scores = await db.execute(
        select(MatchScore, Candidate)
        .join(Candidate, MatchScore.candidate_id == Candidate.id)
        .join(Job, MatchScore.job_id == Job.id)
        .where(Job.created_by == current_user.id)
        .order_by(MatchScore.overall_score.desc())
        .limit(5)
    )
    top_candidates = []
    for score, candidate in top_scores:
        top_candidates.append({
            "id": candidate.id,
            "name": candidate.name,
            "score": score.overall_score,
            "recommendation": score.recommendation,
            "skills": (candidate.skills or {}).get("technical", [])[:3],
        })

    # Recent activity — this user's candidates + jobs
    recent_candidates = await db.execute(
        select(Candidate)
        .where(Candidate.uploaded_by == current_user.id)
        .order_by(Candidate.created_at.desc()).limit(3)
    )
    recent_activity = []
    for c in recent_candidates.scalars():
        recent_activity.append({
            "type": "candidate_uploaded",
            "message": f"New CV uploaded: {c.name}",
            "time": c.created_at.isoformat(),
        })

    recent_jobs = await db.execute(
        select(Job)
        .where(Job.created_by == current_user.id)
        .order_by(Job.created_at.desc())
        .limit(3)
    )
    for j in recent_jobs.scalars():
        recent_activity.append({
            "type": "job_created",
            "message": f"New job posted: {j.title}",
            "time": j.created_at.isoformat(),
        })

    recent_activity.sort(key=lambda x: x["time"], reverse=True)

    # Status breakdowns
    candidates_by_status = {}
    for status in CandidateStatus:
        count = (await db.execute(
            select(func.count(Candidate.id)).where(Candidate.status == status)
        )).scalar()
        candidates_by_status[status.value] = count

    jobs_by_status = {}
    for status in JobStatus:
        count = (await db.execute(
            select(func.count(Job.id))
            .where(Job.status == status, Job.created_by == current_user.id)
        )).scalar()
        jobs_by_status[status.value] = count

    # Weekly Activity (Last 7 Days)
    from datetime import datetime, timedelta
    weekly_activity = []
    now = datetime.now()
    
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day.replace(hour=23, minute=59, second=59, microsecond=999999)
        day_name = day.strftime("%a")

        # Candidates uploaded by this user today
        c_count = (await db.execute(
            select(func.count(Candidate.id))
            .where(Candidate.uploaded_by == current_user.id)
            .where(Candidate.created_at >= day_start)
            .where(Candidate.created_at <= day_end)
        )).scalar() or 0

        # Matches run by this user today (for their jobs)
        m_count = (await db.execute(
            select(func.count(MatchScore.id))
            .join(Job, MatchScore.job_id == Job.id)
            .where(Job.created_by == current_user.id)
            .where(MatchScore.created_at >= day_start)
            .where(MatchScore.created_at <= day_end)
        )).scalar() or 0

        weekly_activity.append({
            "name": day_name,
            "candidates": c_count,
            "matches": m_count
        })

    return DashboardStats(
        total_candidates=total_candidates,
        total_jobs=total_jobs,
        total_matches=total_matches,
        avg_match_score=avg_score,
        top_candidates=top_candidates,
        recent_activity=recent_activity[:6],
        candidates_by_status=candidates_by_status,
        jobs_by_status=jobs_by_status,
        weekly_activity=weekly_activity,
    )
