"""Background scheduler for one-time interview reminder emails."""
import asyncio
from datetime import datetime, timedelta
import os

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.models import Candidate, Interview, InterviewStatus, User
from app.services.email_service import get_email_service


REMINDER_STATE_KEY = "email_notifications"


async def check_and_send_reminders():
    """Send candidate and recruiter reminders during the 30-minute window once."""
    async with AsyncSessionLocal() as db:
        now = datetime.utcnow()
        start_window = now + timedelta(minutes=25)
        end_window = now + timedelta(minutes=35)

        result = await db.execute(
            select(Interview)
            .where(Interview.scheduled_at >= start_window)
            .where(Interview.scheduled_at <= end_window)
            .where(Interview.status == InterviewStatus.scheduled)
            .with_for_update(skip_locked=True)
        )
        interviews = result.scalars().all()
        email_service = get_email_service()
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

        for interview in interviews:
            candidate = await db.get(Candidate, interview.candidate_id)
            recruiter = await db.get(User, interview.recruiter_id)
            if not candidate:
                continue

            metadata = dict(interview.metadata_ or {})
            notifications = dict(metadata.get(REMINDER_STATE_KEY) or {})
            changed = False
            candidate_link = interview.meeting_url or (
                f"{frontend_url}/join/{interview.id}?token={interview.candidate_access_token}"
            )
            recruiter_link = f"{frontend_url}/interview-prejoin/{interview.id}"

            if candidate.email and not notifications.get("candidate_reminder_sent_at"):
                success = await asyncio.to_thread(
                    email_service.send_interview_reminder,
                    candidate_email=candidate.email,
                    candidate_name=candidate.name,
                    interview_title=interview.title,
                    scheduled_at=interview.scheduled_at,
                    meeting_link=candidate_link,
                    recruiter_name=recruiter.full_name if recruiter else "TalentIQ Team",
                    related_entity_id=interview.id,
                )
                if success:
                    notifications["candidate_reminder_sent_at"] = datetime.utcnow().isoformat()
                    changed = True

            if recruiter and recruiter.email and not notifications.get("recruiter_reminder_sent_at"):
                success = await asyncio.to_thread(
                    email_service.send_recruiter_interview_reminder,
                    recruiter_email=recruiter.email,
                    recruiter_name=recruiter.full_name,
                    candidate_name=candidate.name,
                    interview_title=interview.title,
                    scheduled_at=interview.scheduled_at,
                    meeting_link=recruiter_link,
                    candidate_email=candidate.email or "",
                    related_entity_id=interview.id,
                )
                if success:
                    notifications["recruiter_reminder_sent_at"] = datetime.utcnow().isoformat()
                    changed = True

            if changed:
                metadata[REMINDER_STATE_KEY] = notifications
                interview.metadata_ = metadata

        await db.commit()


async def reminder_scheduler():
    """Check upcoming interviews every five minutes."""
    while True:
        try:
            await check_and_send_reminders()
        except Exception as exc:
            print(f"[ERROR] Reminder scheduler failed: {exc}")
        await asyncio.sleep(300)


def start_reminder_scheduler():
    """Start the in-process reminder scheduler."""
    asyncio.create_task(reminder_scheduler())
