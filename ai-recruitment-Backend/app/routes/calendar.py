"""
Calendar Event Management Routes.
Supports CRUD and AI-powered event generation.
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List, Optional
from datetime import datetime, timedelta
import json
import secrets

from app.database import get_db
from app.models.models import CalendarEvent, User, Interview, Candidate, InterviewStatus
from app.models.schemas import CalendarEventResponse, SuccessResponse
from app.utils.auth import get_current_user
from app.services.llm_service import get_llm_service
from app.services.new_email_service import get_new_email_service
from app.config import settings

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


@router.patch("/{event_id}", response_model=CalendarEventResponse)
async def update_event(
    event_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing calendar event."""
    result = await db.execute(
        select(CalendarEvent)
        .where(CalendarEvent.id == event_id)
        .where(CalendarEvent.user_id == current_user.id)
    )
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    try:
        if "title" in data: event.title = data["title"]
        if "description" in data: event.description = data["description"]
        if "event_type" in data: event.event_type = data["event_type"]
        if "priority" in data: event.priority = data["priority"]
        if "participants" in data: event.participants = data["participants"]
        if "reminder_time" in data: event.reminder_time = data["reminder_time"]

        if "start_time" in data:
            event.start_time = datetime.fromisoformat(data["start_time"].replace('Z', '+00:00')).replace(tzinfo=None)
        if "end_time" in data:
            event.end_time = datetime.fromisoformat(data["end_time"].replace('Z', '+00:00')).replace(tzinfo=None)

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


@router.post("/ai-generate")
async def ai_generate_bulk_events(
    request: dict,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bulk AI Scheduling: Parse natural language for multiple events/candidates."""
    text = request.get('text') or request.get('prompt')
    if not text:
        raise HTTPException(status_code=400, detail="Text input is required")

    # Contextual info for the LLM
    now = datetime.now()
    context = f"Today is {now.strftime('%A, %B %d, %Y')}. Current time is {now.strftime('%I:%M %p')}."

    prompt = f"""
    You are a Smart Recruitment Scheduling Assistant.
    {context}
    Analyze the user's request and extract scheduling intents for one OR MORE candidates.

    Guidelines:
    - If multiple candidates, times, or days are mentioned, generate an entry for EACH.
    - For "today", "tomorrow", or relative dates, calculate the exact ISO 8601 date.
    - Default duration is 30 minutes if not specified.
    - Prioritize "interview" as event_type if it sounds like one.

    Return a JSON object with a 'events' array:
    {{
      "events": [
        {{
          "title": "Clear event title (e.g., 'Interview with Rahul')",
          "start_time": "ISO 8601 format",
          "end_time": "ISO 8601 format",
          "description": "Brief context",
          "event_type": "interview|meeting|task|reminder",
          "priority": "low|medium|high",
          "participants": ["optional_email1", "optional_email2"],
          "reminder_time": 30
        }}
      ]
    }}

    User Request: "{text}"
    """

    llm = get_llm_service()
    try:
        response = await llm.generate_json(prompt, system_prompt="You are a precise bulk scheduling AI.")
        extracted_events = response.get("events", [])

        if not extracted_events:
            # Fallback for single object response
            if "title" in response:
                extracted_events = [response]
            else:
                raise ValueError("No events parsed from response")

        created_events = []
        for ev_data in extracted_events:
            event = CalendarEvent(
                user_id=current_user.id,
                title=ev_data.get("title", "Scheduled Event"),
                description=ev_data.get("description", ""),
                event_type=ev_data.get("event_type", "meeting"),
                start_time=datetime.fromisoformat(ev_data["start_time"].replace('Z', '+00:00')).replace(tzinfo=None),
                end_time=datetime.fromisoformat(ev_data["end_time"].replace('Z', '+00:00')).replace(tzinfo=None),
                priority=ev_data.get("priority", "medium"),
                participants=ev_data.get("participants", []),
                reminder_time=ev_data.get("reminder_time", 30)
            )
            db.add(event)
            created_events.append(event)

        await db.commit()
        for ev in created_events:
            await db.refresh(ev)

        # ─── SEND NOTIFICATIONS IN BACKGROUND ───
        async def notify_bulk_participants():
            email_service = get_new_email_service()
            for ev in created_events:
                if not ev.participants:
                    continue

                for participant_email in ev.participants:
                    if "@" not in str(participant_email):
                        continue

                    try:
                        # If it's an interview, we try to find a candidate and create a real interview session
                        if ev.event_type == "interview":
                            # This is a bit complex as we don't have candidate_id from the AI easily
                            # For now, we send a branded invitation email
                            await email_service.send_interview_invitation_candidate(
                                candidate_email=participant_email,
                                candidate_name=ev.title.replace("Interview with ", "").split(" ")[0],
                                role_title=ev.title,
                                scheduled_at=ev.start_time,
                                duration=int((ev.end_time - ev.start_time).total_seconds() / 60),
                                magic_link=f"{settings.frontend_url}/calendar", # Fallback to calendar for now
                                recruiter_name=current_user.full_name,
                                related_id=ev.id
                            )
                        else:
                            # Send standard meeting notification
                            await email_service.provider.send_email(
                                to_email=participant_email,
                                subject=f"Invitation: {ev.title}",
                                html_content=f"<h3>{ev.title}</h3><p>{ev.description}</p><p>Time: {ev.start_time.strftime('%Y-%m-%d %H:%M')}</p>"
                            )
                    except Exception as e:
                        print(f"❌ Failed to notify participant {participant_email}: {e}")

        background_tasks.add_task(notify_bulk_participants)

        return {"message": f"Successfully scheduled {len(created_events)} events", "events": created_events}

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"AI failed to process schedule: {str(e)}")

