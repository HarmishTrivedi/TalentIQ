"""
Simple Email System Test
"""
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

print("=" * 80)
print("EMAIL SYSTEM TEST")
print("=" * 80)

# Check environment
print("\n[1] Environment Variables:")
smtp_user = os.getenv('SMTP_USER')
smtp_password = os.getenv('SMTP_PASSWORD')
print(f"SMTP_USER: {smtp_user}")
print(f"SMTP_PASSWORD: {'SET' if smtp_password else 'NOT SET'}")

if not smtp_user or not smtp_password:
    print("\nERROR: SMTP credentials not configured!")
    exit(1)

# Test SMTP connection
print("\n[2] Testing SMTP Connection...")
try:
    import smtplib
    with smtplib.SMTP('smtp.gmail.com', 587, timeout=10) as server:
        server.starttls()
        server.login(smtp_user, smtp_password)
        print("SUCCESS: SMTP connection and authentication OK")
except Exception as e:
    print(f"ERROR: SMTP failed - {e}")
    exit(1)

# Initialize email service
print("\n[3] Initializing Email Service...")
try:
    from app.services.email_service import get_email_service
    email_service = get_email_service()
    print("SUCCESS: Email service initialized")
except Exception as e:
    print(f"ERROR: Failed to initialize - {e}")
    exit(1)

# Send test email
print("\n[4] Sending Test Welcome Email...")
test_email = input("Enter email address (or press Enter for default): ").strip()
if not test_email:
    test_email = smtp_user

try:
    success = email_service.send_welcome_email(
        recruiter_email=test_email,
        recruiter_name="Test User",
        company_name="Test Company"
    )
    if success:
        print(f"SUCCESS: Welcome email sent to {test_email}")
    else:
        print(f"FAILED: Could not send email to {test_email}")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()

# Send interview invitation
print("\n[5] Sending Test Interview Invitation...")
try:
    scheduled_time = datetime.now() + timedelta(hours=2)
    success = email_service.send_interview_invitation(
        candidate_email=test_email,
        candidate_name="Test Candidate",
        interview_title="Python Developer Interview",
        scheduled_at=scheduled_time,
        duration=60,
        meeting_link="https://meet.google.com/test",
        recruiter_name="Test Recruiter"
    )
    if success:
        print(f"SUCCESS: Interview invitation sent to {test_email}")
    else:
        print(f"FAILED: Could not send invitation to {test_email}")
except Exception as e:
    print(f"ERROR: {e}")

print("\n" + "=" * 80)
print("TEST COMPLETED")
print("=" * 80)
print(f"\nCheck your inbox: {test_email}")
print("Look in Spam folder if not in Inbox")
