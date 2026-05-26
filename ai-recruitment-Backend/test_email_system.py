"""
Comprehensive Email System Test
Tests all email functionality end-to-end
"""
import asyncio
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("=" * 80)
print("EMAIL SYSTEM COMPREHENSIVE TEST")
print("=" * 80)

# Test 1: Check environment variables
print("\n[1] CHECKING ENVIRONMENT VARIABLES")
print("-" * 80)
smtp_server = os.getenv('SMTP_SERVER')
smtp_port = os.getenv('SMTP_PORT')
smtp_user = os.getenv('SMTP_USER')
smtp_password = os.getenv('SMTP_PASSWORD')
from_email = os.getenv('FROM_EMAIL')
from_name = os.getenv('FROM_NAME')
frontend_url = os.getenv('FRONTEND_URL')

print(f"SMTP_SERVER: {smtp_server}")
print(f"SMTP_PORT: {smtp_port}")
print(f"SMTP_USER: {smtp_user}")
print(f"SMTP_PASSWORD: {'*' * len(smtp_password) if smtp_password else 'NOT SET'}")
print(f"FROM_EMAIL: {from_email}")
print(f"FROM_NAME: {from_name}")
print(f"FRONTEND_URL: {frontend_url}")

if not smtp_user or not smtp_password:
    print("\n❌ ERROR: SMTP credentials not configured!")
    print("Please set SMTP_USER and SMTP_PASSWORD in .env file")
    exit(1)
else:
    print("\n✅ Environment variables loaded successfully")

# Test 2: Test SMTP connection
print("\n[2] TESTING SMTP CONNECTION")
print("-" * 80)
try:
    import smtplib
    with smtplib.SMTP(smtp_server, int(smtp_port), timeout=10) as server:
        server.set_debuglevel(0)
        server.starttls()
        server.login(smtp_user, smtp_password)
        print("✅ SMTP connection successful")
        print("✅ SMTP authentication successful")
except smtplib.SMTPAuthenticationError as e:
    print(f"❌ SMTP authentication failed: {e}")
    print("Please check your SMTP_USER and SMTP_PASSWORD")
    exit(1)
except Exception as e:
    print(f"❌ SMTP connection failed: {e}")
    exit(1)

# Test 3: Initialize email service
print("\n[3] INITIALIZING EMAIL SERVICE")
print("-" * 80)
try:
    from app.services.email_service import get_email_service
    email_service = get_email_service()
    print("✅ Email service initialized")
except Exception as e:
    print(f"❌ Failed to initialize email service: {e}")
    exit(1)

# Test 4: Send test welcome email
print("\n[4] SENDING TEST WELCOME EMAIL")
print("-" * 80)
test_email = input("Enter your email address to receive test email: ").strip()
if not test_email:
    test_email = smtp_user

try:
    success = email_service.send_welcome_email(
        recruiter_email=test_email,
        recruiter_name="Test User",
        company_name="Test Company"
    )
    if success:
        print(f"✅ Welcome email sent successfully to {test_email}")
    else:
        print(f"❌ Failed to send welcome email to {test_email}")
except Exception as e:
    print(f"❌ Error sending welcome email: {e}")
    import traceback
    traceback.print_exc()

# Test 5: Send test interview invitation
print("\n[5] SENDING TEST INTERVIEW INVITATION")
print("-" * 80)
try:
    scheduled_time = datetime.now() + timedelta(hours=2)
    success = email_service.send_interview_invitation(
        candidate_email=test_email,
        candidate_name="Test Candidate",
        interview_title="Senior Python Developer Interview",
        scheduled_at=scheduled_time,
        duration=60,
        meeting_link=f"{frontend_url}/interview-room/test123",
        recruiter_name="Test Recruiter",
        description="This is a test interview invitation"
    )
    if success:
        print(f"✅ Interview invitation sent successfully to {test_email}")
    else:
        print(f"❌ Failed to send interview invitation to {test_email}")
except Exception as e:
    print(f"❌ Error sending interview invitation: {e}")
    import traceback
    traceback.print_exc()

# Test 6: Send test interview reminder
print("\n[6] SENDING TEST INTERVIEW REMINDER")
print("-" * 80)
try:
    reminder_time = datetime.now() + timedelta(minutes=30)
    success = email_service.send_interview_reminder(
        candidate_email=test_email,
        candidate_name="Test Candidate",
        interview_title="Senior Python Developer Interview",
        scheduled_at=reminder_time,
        meeting_link=f"{frontend_url}/interview-room/test123",
        recruiter_name="Test Recruiter"
    )
    if success:
        print(f"✅ Interview reminder sent successfully to {test_email}")
    else:
        print(f"❌ Failed to send interview reminder to {test_email}")
except Exception as e:
    print(f"❌ Error sending interview reminder: {e}")
    import traceback
    traceback.print_exc()

# Test 7: Check database email logging (if available)
print("\n[7] CHECKING EMAIL ACTIVITY LOG")
print("-" * 80)
try:
    from app.database import AsyncSessionLocal
    from app.models.models import EmailActivityLog
    from sqlalchemy import select
    
    async def check_logs():
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(EmailActivityLog)
                .order_by(EmailActivityLog.created_at.desc())
                .limit(5)
            )
            logs = result.scalars().all()
            
            if logs:
                print(f"✅ Found {len(logs)} recent email logs:")
                for log in logs:
                    status_icon = "✅" if log.status == "sent" else "❌"
                    print(f"   {status_icon} {log.email_type} to {log.recipient_email} - {log.status}")
            else:
                print("⚠️  No email logs found in database")
    
    asyncio.run(check_logs())
except Exception as e:
    print(f"⚠️  Could not check email logs: {e}")

# Summary
print("\n" + "=" * 80)
print("EMAIL SYSTEM TEST COMPLETED")
print("=" * 80)
print("\n[EMAIL] Check your inbox at:", test_email)
print("You should have received:")
print("  1. Welcome email")
print("  2. Interview invitation")
print("  3. Interview reminder")
print("\nIf you didn't receive emails, check:")
print("  - Spam/Junk folder")
print("  - SMTP credentials in .env file")
print("  - Gmail app password (not regular password)")
print("  - 2FA enabled on Gmail account")
print("\n" + "=" * 80)
