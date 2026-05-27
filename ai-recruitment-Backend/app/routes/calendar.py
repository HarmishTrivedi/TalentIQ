"""
Calendar Event Management Routes.
Supports CRUD and AI-powered event generation.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List, Optional
from datetime import datetime, timedelta
import json

from app.database import get_db
from app.models.models import CalendarEvent, User
from app.models.schemas import CalendarEventResponse, SuccessResponse
from app.utils.auth import get_current_user
from app.services.llm_service import get_llm_service

router = APIRouter(prefix="/calendar", tags=["Calendar"])

@router.get("", response_model=List[CalendarEventResponse])
async def list_events(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List calendar events for the current user."""
    query = select(CalendarEvent).where(CalendarEvent.user_id == current_user.id)
    
    if start_date:
        query = query.where(CalendarEvent.start_time >= start_date.replace(tzinfo=None))
    if end_date:
        query = query.where(CalendarEvent.end_time <= end_date.replace(tzinfo=None))
        
    result = await db.execute(query.order_by(CalendarEvent.start_time.asc()))
    events = result.scalars().all()
    return events

@router.post("", response_model=CalendarEventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new calendar event."""
    try:
        start_time = datetime.fromisoformat(data["start_time"].replace('Z', '+00:00')).replace(tzinfo=None)
        end_time = datetime.fromisoformat(data["end_time"].replace('Z', '+00:00')).replace(tzinfo=None)
        
        event = CalendarEvent(
            user_id=current_user.id,
            title=data["title"],
            description=data.get("description"),
            event_type=data.get("event_type", "meeting"),
            start_time=start_time,
            end_time=end_time,
            priority=data.get("priority", "medium"),
            participants=data.get("participants", []),
            reminder_time=data.get("reminder_time", 30)
        )
        db.add(event)
        await db.commit()
        await db.refresh(event)
        return event
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Invalid event data: {str(e)}")

@router.delete("/{event_id}")
async def delete_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a calendar event."""
    await db.execute(
        delete(CalendarEvent)
        .where(CalendarEvent.id == event_id)
        .where(CalendarEvent.user_id == current_user.id)
    )
    await db.commit()
    return {"message": "Event deleted"}

@router.post("/ai-generate", response_model=CalendarEventResponse)
async def ai_generate_event(
    request: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Parse natural language into a calendar event using LLM."""
    prompt = f"""
    You are a scheduling assistant. Extract event details from this text:
    "{request['text']}"
    
    Current Time (UTC): {datetime.utcnow().isoformat()}
    
    Return EXACTLY this JSON:
    {{
      "title": "Short title",
      "description": "Full description",
      "event_type": "interview|meeting|task|reminder",
      "start_time": "ISO format string",
      "end_time": "ISO format string (default 1 hour after start)",
      "priority": "low|medium|high",
      "participants": ["email1", "email2"],
      "reminder_time": 30
    }}
    """
    
    llm = get_llm_service()
    event_data = await llm.generate_json(prompt, system_prompt="You are a precise scheduling AI.")
    
    try:
        start_time = datetime.fromisoformat(event_data["start_time"].replace('Z', '+00:00')).replace(tzinfo=None)
        end_time = datetime.fromisoformat(event_data["end_time"].replace('Z', '+00:00')).replace(tzinfo=None)
        
        # Save automatically
        event = CalendarEvent(
            user_id=current_user.id,
            title=event_data["title"],
            description=event_data.get("description"),
            event_type=event_data.get("event_type", "meeting"),
            start_time=start_time,
            end_time=end_time,
            priority=event_data.get("priority", "medium"),
            participants=event_data.get("participants", []),
            reminder_time=event_data.get("reminder_time", 30)
        )
        db.add(event)
        await db.commit()
        await db.refresh(event)
        return event
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"AI generated invalid data: {str(e)}")
