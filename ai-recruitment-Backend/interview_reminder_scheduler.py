"""
Interview Reminder Scheduler Service
Automatically sends reminder emails 30 minutes before scheduled interviews
"""

import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
import os

from app.database import AsyncSessionLocal
from app.models.models import Interview, InterviewStatus, Candidate, User
from app.services.email_service import get_email_service


class InterviewReminderScheduler:
    """Background service to send interview reminders"""
    
    def __init__(self):
        self.email_service = get_email_service()
        self.check_interval = 60  # Check every 60 seconds
        self.reminder_window = 30  # Send reminder 30 minutes before
        self.frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
        
    async def check_and_send_reminders(self):
        """Check for upcoming interviews and send reminders"""
        async with AsyncSessionLocal() as db:
            try:
                # Calculate time window (30-31 minutes from now)
                now = datetime.utcnow()
                reminder_start = now + timedelta(minutes=self.reminder_window)
                reminder_end = now + timedelta(minutes=self.reminder_window + 1)
                
                # Find interviews scheduled in the reminder window
                result = await db.execute(
                    select(Interview)
                    .options(
                        selectinload(Interview.candidate),
                        selectinload(Interview.recruiter)
                    )
                    .where(
                        and_(
                            Interview.status == InterviewStatus.scheduled,
                            Interview.scheduled_at >= reminder_start,
                            Interview.scheduled_at < reminder_end
                        )
                    )
                )
                interviews = result.scalars().all()
                
                if interviews:
                    print(f"📧 Found {len(interviews)} interviews needing reminders")
                
                for interview in interviews:
                    await self.send_interview_reminders(interview, db)
                    
            except Exception as e:
                print(f"❌ Error checking for interview reminders: {e}")
                import traceback
                traceback.print_exc()
    
    async def send_interview_reminders(self, interview: Interview, db):
        """Send reminder emails to both candidate and recruiter"""
        try:
            candidate = interview.candidate
            recruiter = interview.recruiter
            
            if not candidate or not recruiter:
                print(f"⚠️  Missing candidate or recruiter for interview {interview.id}")
                return
            
            # Generate meeting link (same as invitation)
            meeting_link = f"{self.frontend_url}/interview-prejoin/{interview.id}?token={interview.candidate_access_token}"
            
            # Send candidate reminder
            if candidate.email:
                try:
                    success = self.email_service.send_interview_reminder(
                        candidate_email=candidate.email,
                        candidate_name=candidate.name,
                        interview_title=interview.title,
                        scheduled_at=interview.scheduled_at,
                        meeting_link=meeting_link,
                        recruiter_name=recruiter.full_name
                    )
                    if success:
                        print(f"✅ Reminder sent to candidate: {candidate.email}")
                    else:
                        print(f"❌ Failed to send reminder to candidate: {candidate.email}")
                except Exception as e:
                    print(f"❌ Error sending candidate reminder: {e}")
            
            # Send recruiter reminder
            if recruiter.email:
                try:
                    recruiter_meeting_link = f"{self.frontend_url}/interview-prejoin/{interview.id}"
                    success = self.email_service.send_recruiter_interview_reminder(
                        recruiter_email=recruiter.email,
                        recruiter_name=recruiter.full_name,
                        candidate_name=candidate.name,
                        interview_title=interview.title,
                        scheduled_at=interview.scheduled_at,
                        meeting_link=recruiter_meeting_link,
                        candidate_email=candidate.email
                    )
                    if success:
                        print(f"✅ Reminder sent to recruiter: {recruiter.email}")
                    else:
                        print(f"❌ Failed to send reminder to recruiter: {recruiter.email}")
                except Exception as e:
                    print(f"❌ Error sending recruiter reminder: {e}")
                    
        except Exception as e:
            print(f"❌ Error in send_interview_reminders: {e}")
            import traceback
            traceback.print_exc()
    
    async def run(self):
        """Main loop - runs continuously"""
        print("=" * 70)
        print("🚀 INTERVIEW REMINDER SCHEDULER STARTED")
        print(f"⏰ Checking every {self.check_interval} seconds")
        print(f"📧 Sending reminders {self.reminder_window} minutes before interviews")
        print("=" * 70)
        
        while True:
            try:
                await self.check_and_send_reminders()
                await asyncio.sleep(self.check_interval)
            except KeyboardInterrupt:
                print("\n⛔ Scheduler stopped by user")
                break
            except Exception as e:
                print(f"❌ Unexpected error in scheduler: {e}")
                await asyncio.sleep(self.check_interval)


async def main():
    """Entry point for the scheduler"""
    scheduler = InterviewReminderScheduler()
    await scheduler.run()


if __name__ == "__main__":
    asyncio.run(main())
