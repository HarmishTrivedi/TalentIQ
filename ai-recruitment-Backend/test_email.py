"""
Test script to verify SMTP email configuration
"""
import asyncio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_email():
    from app.services.email_service import get_email_service
    
    email_service = get_email_service()
    
    print("Testing SMTP Configuration...")
    print(f"SMTP Server: {email_service.smtp_server}")
    print(f"SMTP Port: {email_service.smtp_port}")
    print(f"SMTP User: {email_service.smtp_user}")
    print(f"From Email: {email_service.from_email}")
    
    # Test candidate confirmation email
    print("\nSending test candidate confirmation email...")
    result1 = email_service.send_candidate_application_confirmation(
        candidate_email=email_service.smtp_user,  # Send to yourself for testing
        candidate_name="Test Candidate",
        skills=["Python", "FastAPI", "React", "PostgreSQL"],
        experience_years=3.5
    )
    
    if result1:
        print("SUCCESS: Candidate confirmation email sent successfully!")
    else:
        print("FAILED: Could not send candidate confirmation email")
    
    # Test recruiter notification email
    print("\nSending test recruiter notification email...")
    result2 = email_service.send_recruiter_new_candidate_notification(
        recruiter_email=email_service.smtp_user,  # Send to yourself for testing
        recruiter_name="Test Recruiter",
        candidate_name="John Doe",
        candidate_email="john.doe@example.com",
        skills=["Python", "Django", "AWS", "Docker"],
        experience_years=5.0,
        summary="Experienced software engineer with expertise in backend development and cloud infrastructure."
    )
    
    if result2:
        print("SUCCESS: Recruiter notification email sent successfully!")
    else:
        print("FAILED: Could not send recruiter notification email")
    
    print("\nEmail test completed!")

if __name__ == "__main__":
    asyncio.run(test_email())
