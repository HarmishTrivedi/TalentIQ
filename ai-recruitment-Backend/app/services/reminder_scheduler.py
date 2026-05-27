"""Background scheduler for one-time interview reminder emails."""
import asyncio
from datetime import datetime, timedelta
import os

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.models import Candidate, Interview, InterviewStatus, User
from app.services.new_email_service import get_new_email_service


REMINDER_STATE_KEY = "email_notifications_v2"


async def check_and_send_reminders():
    """Process multiple reminder tiers: 24h, 1h, 30m, 15m."""
    async with AsyncSessionLocal() as db:
        now = datetime.utcnow()
        
        # Define reminder tiers (minutes before, display name, unique key)
        tiers = [
            (1440, "24 hours", "24h"),
            (60, "1 hour", "1h"),
            (30, "30 minutes", "30m"),
            (15, "15 minutes", "15m"),
        ]

        email_service = get_new_email_service()
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

        for minutes_before, display_name, key in tiers:
            # Create a window for this tier (e.g. if we check every 5m, use +/- 3m)
            start_window = now + timedelta(minutes=minutes_before - 5)
            end_window = now + timedelta(minutes=minutes_before + 5)

            result = await db.execute(
                select(Interview)
                .where(Interview.scheduled_at >= start_window)
                .where(Interview.scheduled_at <= end_window)
                .where(Interview.status == InterviewStatus.scheduled)
            )
            interviews = result.scalars().all()

            for interview in interviews:
                metadata = dict(interview.metadata_ or {})
                notifications = dict(metadata.get(REMINDER_STATE_KEY) or {})
                
                # Check if this specific reminder has already been sent
                if notifications.get(f"sent_{key}"):
                    continue
                
                candidate = await db.get(Candidate, interview.candidate_id)
                recruiter = await db.get(User, interview.recruiter_id)
                if not candidate:
                    continue

                candidate_link = interview.meeting_url or (
                    f"{frontend_url}/join/{interview.id}?token={interview.candidate_access_token}"
                )
                recruiter_link = f"{frontend_url}/interview-prejoin/{interview.id}"

                # Send to Candidate
                if candidate.email:
                    try:
                        await email_service.send_interview_reminder(
                            to_email=candidate.email,
                            name=candidate.name,
                            role_title=interview.title,
                            time_remaining_str=display_name,
                            link=candidate_link,
                            is_candidate=True,
                            related_id=interview.id
                        )
                    except Exception as e:
                        print(f"⚠️ Failed to send {key} candidate reminder: {e}")

                # Send to Recruiter
                if recruiter and recruiter.email:
                    try:
                        await email_service.send_interview_reminder(
                            to_email=recruiter.email,
                            name=recruiter.full_name,
                            role_title=interview.title,
                            time_remaining_str=display_name,
                            link=recruiter_link,
                            is_candidate=False,
                            related_id=interview.id
                        )
                    except Exception as e:
                        print(f"⚠️ Failed to send {key} recruiter reminder: {e}")

                # Mark as sent
                notifications[f"sent_{key}"] = now.isoformat()
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
