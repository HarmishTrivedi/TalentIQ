"""
Background Scheduler for Interview Reminders
Sends reminder emails 30 minutes before scheduled interviews
"""
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.models import Interview, Candidate, User
from app.services.email_service import get_email_service
import os


async def check_and_send_reminders():
    """Check for interviews starting in 30 minutes and send reminders"""
    try:
        async with AsyncSessionLocal() as db:
            now = datetime.utcnow()
            reminder_time = now + timedelta(minutes=30)
            
            # Find interviews scheduled between now+25min and now+35min
            start_window = now + timedelta(minutes=25)
            end_window = now + timedelta(minutes=35)
            
            result = await db.execute(
                select(Interview)
                .where(Interview.scheduled_at >= start_window)
                .where(Interview.scheduled_at <= end_window)
                .where(Interview.status == 'scheduled')
            )
            interviews = result.scalars().all()
            
            email_service = get_email_service()
            frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
            
            for interview in interviews:
                # Get candidate
                candidate = await db.get(Candidate, interview.candidate_id)
                if not candidate or not candidate.email:
                    continue
                
                # Get recruiter
                recruiter = await db.get(User, interview.recruiter_id)
                
                # Send reminder to candidate
                meeting_link = f"{frontend_url}/interview-room/{interview.id}"
                
                try:
                    email_service.send_interview_reminder(
                        candidate_email=candidate.email,
                        candidate_name=candidate.name,
                        interview_title=interview.title,
                        scheduled_at=interview.scheduled_at,
                        meeting_link=meeting_link,
                        recruiter_name=recruiter.full_name if recruiter else "TalentIQ Team"
                    )
                    print(f"✅ Reminder sent to candidate: {candidate.email}")
                except Exception as e:
                    print(f"❌ Failed to send reminder to candidate: {e}")
                
                # Send reminder to recruiter
                if recruiter and recruiter.email:
                    try:
                        email_service.send_recruiter_interview_reminder(
                            recruiter_email=recruiter.email,
                            recruiter_name=recruiter.full_name,
                            candidate_name=candidate.name,
                            interview_title=interview.title,
                            scheduled_at=interview.scheduled_at,
                            meeting_link=meeting_link,
                            candidate_email=candidate.email
                        )
                        print(f"✅ Reminder sent to recruiter: {recruiter.email}")
                    except Exception as e:
                        print(f"❌ Failed to send reminder to recruiter: {e}")
    except Exception as e:
        # Catch database errors (like missing columns) and log without crashing
        print(f"⚠️  Reminder scheduler skipped (database migration needed): {str(e)[:100]}")


async def reminder_scheduler():
    """Run reminder checker every 5 minutes"""
    while True:
        try:
            await check_and_send_reminders()
        except Exception as e:
            # Log error but don't crash - scheduler will retry in 5 minutes
            print(f"⚠️  Reminder scheduler error (will retry): {str(e)[:100]}")
        
        # Wait 5 minutes before next check
        await asyncio.sleep(300)


def start_reminder_scheduler():
    """Start the reminder scheduler in background"""
    asyncio.create_task(reminder_scheduler())
