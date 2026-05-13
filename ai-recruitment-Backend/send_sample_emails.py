"""
Send sample emails to harmish.lumoslogic@gmail.com
"""
import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def send_sample_emails():
    from app.services.email_service import get_email_service
    
    email_service = get_email_service()
    
    target_email = "harmish.lumoslogic@gmail.com"
    
    print(f"Sending sample emails to: {target_email}")
    print("=" * 60)
    
    # 1. Send Candidate Confirmation Email
    print("\n[1/2] Sending CANDIDATE CONFIRMATION email...")
    result1 = email_service.send_candidate_application_confirmation(
        candidate_email=target_email,
        candidate_name="Harmish Patel",
        skills=[
            "Python", "FastAPI", "React", "TypeScript", "PostgreSQL", 
            "Docker", "AWS", "Git", "REST APIs", "Machine Learning"
        ],
        experience_years=5.5
    )
    
    if result1:
        print("SUCCESS: Candidate confirmation email sent!")
    else:
        print("FAILED: Could not send candidate confirmation email")
    
    # Small delay between emails
    await asyncio.sleep(2)
    
    # 2. Send Recruiter Notification Email
    print("\n[2/2] Sending RECRUITER NOTIFICATION email...")
    result2 = email_service.send_recruiter_new_candidate_notification(
        recruiter_email=target_email,
        recruiter_name="Harmish Patel",
        candidate_name="John Doe",
        candidate_email="john.doe@example.com",
        skills=[
            "Python", "Django", "FastAPI", "React", "Node.js",
            "PostgreSQL", "MongoDB", "Docker", "Kubernetes", "AWS",
            "CI/CD", "Git", "REST APIs", "GraphQL", "Microservices"
        ],
        experience_years=7.0,
        summary="Highly skilled Full Stack Developer with 7 years of experience in building scalable web applications. Expertise in Python, Django, FastAPI, and React. Strong background in cloud infrastructure (AWS), containerization (Docker/Kubernetes), and microservices architecture. Proven track record of leading development teams and delivering high-quality software solutions. Passionate about clean code, best practices, and continuous learning."
    )
    
    if result2:
        print("SUCCESS: Recruiter notification email sent!")
    else:
        print("FAILED: Could not send recruiter notification email")
    
    print("\n" + "=" * 60)
    print(f"DONE: Both emails sent to: {target_email}")
    print("\nPlease check your inbox (and spam folder if needed)")
    print("\nEmail 1: Application Received - Harmish Patel")
    print("Email 2: New Candidate Application: John Doe")

if __name__ == "__main__":
    asyncio.run(send_sample_emails())
