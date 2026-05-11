"""AI Chat routes: sessions and messages."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.models import ChatSession, ChatMessage, User
from app.models.schemas import (
    ChatSessionCreate, ChatSessionResponse,
    ChatMessageCreate, ChatMessageResponse, ChatResponse,
)
from app.services.chat_service import get_chat_service
from app.utils.auth import get_current_user, get_optional_user

router = APIRouter(prefix="/chat", tags=["AI Chat"])


@router.post("/sessions", response_model=ChatSessionResponse, status_code=201)
async def create_session(
    data: ChatSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new chat session with optional candidate/job context."""
    service = get_chat_service()
    session = await service.create_session(
        db=db,
        candidate_id=data.candidate_id,
        job_id=data.job_id,
        user_id=current_user.id if current_user else None,
        title=data.title,
    )

    # Load messages for response
    msgs_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .where(ChatMessage.role != "system")
        .order_by(ChatMessage.created_at.asc())
    )
    messages = msgs_result.scalars().all()

    return ChatSessionResponse(
        id=session.id,
        candidate_id=session.candidate_id,
        job_id=session.job_id,
        title=session.title,
        messages=[ChatMessageResponse.model_validate(m) for m in messages],
        created_at=session.created_at,
    )


@router.post("/sessions/{session_id}/messages", response_model=ChatResponse)
async def send_message(
    session_id: str,
    message: ChatMessageCreate,
    db: AsyncSession = Depends(get_db),
):
    """Send a message and get AI response."""
    service = get_chat_service()
    try:
        ai_msg = await service.send_message(
            db=db,
            session_id=session_id,
            user_content=message.content,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return ChatResponse(
        session_id=session_id,
        message=ChatMessageResponse.model_validate(ai_msg),
    )


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """Get a chat session with its message history."""
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    msgs_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .where(ChatMessage.role != "system")
        .order_by(ChatMessage.created_at.asc())
    )
    messages = msgs_result.scalars().all()

    return ChatSessionResponse(
        id=session.id,
        candidate_id=session.candidate_id,
        job_id=session.job_id,
        title=session.title,
        messages=[ChatMessageResponse.model_validate(m) for m in messages],
        created_at=session.created_at,
    )


@router.get("/sessions")
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List chat sessions scoped to the current user."""
    service = get_chat_service()
    sessions = await service.get_sessions(db=db, user_id=current_user.id)
    return sessions


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(session)
