"""Candidate management routes: upload, list, get, delete."""
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete

from app.database import get_db
from app.models.models import Candidate, User
from app.models.schemas import CandidateResponse, CandidateListResponse
from app.services.cv_service import CVProcessingService
from app.utils.auth import get_optional_user
from app.config import settings

router = APIRouter(prefix="/candidates", tags=["Candidates"])

ALLOWED_TYPES = {
    "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword", "text/plain"
}


@router.post("/upload", response_model=CandidateResponse, status_code=201)
async def upload_cv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_optional_user),
):
    """Upload and process a candidate CV."""
    # Validate file
    if file.content_type not in ALLOWED_TYPES:
        suffix = Path(file.filename or "").suffix.lower()
        if suffix not in (".pdf", ".docx", ".doc", ".txt"):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Allowed: PDF, DOCX, TXT",
            )

    file_bytes = await file.read()
    if len(file_bytes) > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size: {settings.max_file_size_mb}MB",
        )

    if len(file_bytes) < 100:
        raise HTTPException(status_code=400, detail="File appears to be empty")

    service = CVProcessingService()
    candidate = await service.process_cv(
        file_bytes=file_bytes,
        filename=file.filename,
        db=db,
        user_id=current_user.id if current_user else None,
    )


    return candidate


@router.get("", response_model=CandidateListResponse)
async def list_candidates(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str = Query(default=None),
    status: str = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_optional_user),
):
    """List candidates — scoped to the current user's uploads."""
    query = select(Candidate)

    # Scope to current user's uploads for data isolation
    if current_user:
        query = query.where(Candidate.uploaded_by == current_user.id)

    if search:
        search_filter = f"%{search}%"
        query = query.where(
            Candidate.name.ilike(search_filter) |
            Candidate.email.ilike(search_filter)
        )

    if status:
        query = query.where(Candidate.status == status)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    query = query.order_by(Candidate.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    candidates = result.scalars().all()

    return CandidateListResponse(
        candidates=candidates,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(
    candidate_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_optional_user),
):
    """Get a specific candidate — only if it belongs to the current user."""
    query = select(Candidate).where(Candidate.id == candidate_id)
    if current_user:
        query = query.where(Candidate.uploaded_by == current_user.id)
    result = await db.execute(query)
    candidate = result.scalar_one_or_none()

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    return candidate


@router.delete("/{candidate_id}", status_code=204)
async def delete_candidate(
    candidate_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_optional_user),
):
    """Delete a candidate — only if it belongs to the current user."""
    query = select(Candidate).where(Candidate.id == candidate_id)
    if current_user:
        query = query.where(Candidate.uploaded_by == current_user.id)
    result = await db.execute(query)
    candidate = result.scalar_one_or_none()

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    from app.models.models import MatchScore, ChatSession, ChatMessage
    
    # 1. Delete associated match scores
    await db.execute(delete(MatchScore).where(MatchScore.candidate_id == candidate_id))
    
    # 2. Delete associated chat messages and sessions
    sessions_result = await db.execute(select(ChatSession.id).where(ChatSession.candidate_id == candidate_id))
    session_ids = sessions_result.scalars().all()
    if session_ids:
        await db.execute(delete(ChatMessage).where(ChatMessage.session_id.in_(session_ids)))
        await db.execute(delete(ChatSession).where(ChatSession.candidate_id == candidate_id))

    # 3. Delete from FAISS
    from app.vector_store.faiss_store import get_vector_store
    vector_store = get_vector_store()
    await vector_store.delete_document(candidate_id)

    # Delete file
    file_path = Path(candidate.cv_file_path)
    if file_path.exists():
        file_path.unlink()

    await db.delete(candidate)
    await db.commit()


@router.post("/{candidate_id}/reprocess", response_model=CandidateResponse)
async def reprocess_candidate(
    candidate_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_optional_user),
):
    """Reprocess a candidate's CV."""
    query = select(Candidate).where(Candidate.id == candidate_id)
    if current_user:
        query = query.where(Candidate.uploaded_by == current_user.id)
    result = await db.execute(query)
    candidate = result.scalar_one_or_none()

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    service = CVProcessingService()
    try:
        candidate = await service.reprocess_candidate(candidate_id, db)
        return candidate
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
