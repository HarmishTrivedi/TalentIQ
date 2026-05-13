"""
Send demo interview reminder emails to harmish.lumoslogic@gmail.com
"""
import asyncio
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def send_demo_interview_reminders():
    from app.services.email_service import get_email_service
    
    email_service = get_email_service()
    
    target_email = "harmish.lumoslogic@gmail.com"
    
    # Set interview time to 30 minutes from now for demo
    interview_time = datetime.now() + timedelta(minutes=30)
    
    # Demo meeting link
    meeting_link = "https://meet.google.com/abc-defg-hij"
    
    print(f"Sending interview reminder demo emails to: {target_email}")
    print("=" * 70)
    print(f"Demo Interview Time: {interview_time.strftime('%A, %B %d, %Y at %I:%M %p')}")
    print("=" * 70)
    
    # 1. Send Candidate Interview Reminder
    print("\n[1/2] Sending CANDIDATE INTERVIEW REMINDER...")
    result1 = email_service.send_interview_reminder(
        candidate_email=target_email,
        candidate_name="Harmish Patel",
        interview_title="Senior Full Stack Developer Position",
        scheduled_at=interview_time,
        meeting_link=meeting_link,
        recruiter_name="Sarah Johnson"
    )
    
    if result1:
        print("SUCCESS: Candidate interview reminder sent!")
    else:
        print("FAILED: Could not send candidate reminder")
    
    # Small delay between emails
    await asyncio.sleep(2)
    
    # 2. Send Recruiter Interview Reminder
    print("\n[2/2] Sending RECRUITER INTERVIEW REMINDER...")
    result2 = email_service.send_recruiter_interview_reminder(
        recruiter_email=target_email,
        recruiter_name="Sarah Johnson",
        candidate_name="John Doe",
        interview_title="Senior Full Stack Developer Position",
        scheduled_at=interview_time,
        meeting_link=meeting_link,
        candidate_email="john.doe@example.com"
    )
    
    if result2:
        print("SUCCESS: Recruiter interview reminder sent!")
    else:
        print("FAILED: Could not send recruiter reminder")
    
    print("\n" + "=" * 70)
    print(f"DONE: Both interview reminder emails sent to: {target_email}")
    print("\nPlease check your inbox (and spam folder if needed)")
    print("\nEmail 1: Reminder: Interview in 30 Minutes (Candidate)")
    print("Email 2: Reminder: Interview in 30 Minutes with John Doe (Recruiter)")
    print("\n" + "=" * 70)

if __name__ == "__main__":
    asyncio.run(send_demo_interview_reminders())
