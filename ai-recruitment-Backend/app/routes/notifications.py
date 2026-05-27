"""
Notification Management Routes.
Handles fetching, marking as read, and clearing notifications.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.models import Notification, User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[dict])
async def list_notifications(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List notifications for the current user."""
    query = select(Notification).where(Notification.user_id == current_user.id)
    result = await db.execute(query.order_by(Notification.created_at.desc()).offset(skip).limit(limit))
    notifications = result.scalars().all()
    
    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "is_read": n.is_read,
            "link": n.link,
            "created_at": n.created_at
        } for n in notifications
    ]

@router.get("/unread-count")
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the number of unread notifications."""
    from sqlalchemy import func
    query = select(func.count(Notification.id)).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    )
    result = await db.execute(query)
    count = result.scalar()
    return {"count": count}

@router.patch("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a specific notification as read."""
    await db.execute(
        update(Notification)
        .where(Notification.id == notification_id)
        .where(Notification.user_id == current_user.id)
        .values(is_read=True)
    )
    await db.commit()
    return {"message": "Notification marked as read"}

@router.patch("/read-all")
async def mark_all_as_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all notifications as read."""
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id)
        .values(is_read=True)
    )
    await db.commit()
    return {"message": "All notifications marked as read"}

@router.delete("/clear")
async def clear_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete all notifications for the user."""
    await db.execute(
        delete(Notification).where(Notification.user_id == current_user.id)
    )
    await db.commit()
    return {"message": "Notifications cleared"}
