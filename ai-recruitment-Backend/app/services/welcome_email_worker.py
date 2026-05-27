"""
Background Email Worker
Sends welcome emails to new users without blocking registration/OAuth
"""
import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.models import User
from app.services.new_email_service import get_new_email_service


async def send_pending_welcome_emails():
    """Find users who need welcome emails and send them using new EmailJS service"""
    try:
        async with AsyncSessionLocal() as db:
            # Only send to recruiters who haven't received it yet
            result = await db.execute(
                select(User)
                .where(User.welcome_email_sent == False)
                .where(User.role == 'recruiter')
                .limit(20)
            )
            users = result.scalars().all()
            
            if not users:
                return
            
            email_service = get_new_email_service()
            
            for user in users:
                try:
                    print(f"[EMAIL] Sending welcome email to: {user.email} (EmailJS)")
                    result = await email_service.send_welcome_email(
                        user_email=user.email,
                        user_name=user.full_name,
                        related_id=user.id
                    )
                    
                    if result.get("status") == "sent":
                        user.welcome_email_sent = True
                        await db.commit()
                        print(f"[OK] Welcome email sent: {user.email}")
                    else:
                        print(f"[ERROR] Welcome email failed: {user.email} - {result.get('error_message')}")
                        
                except Exception as e:
                    print(f"[ERROR] Error sending welcome email to {user.email}: {str(e)}")
                    
    except Exception as e:
        print(f"[ERROR] Welcome email worker error: {str(e)}")


async def welcome_email_worker():
    """Run welcome email worker every 30 seconds"""
    while True:
        try:
            await send_pending_welcome_emails()
        except Exception as e:
            print(f"[ERROR] Worker error: {str(e)}")
        
        # Wait 30 seconds before next check
        await asyncio.sleep(30)


def start_welcome_email_worker():
    """Start the welcome email worker in background"""
    asyncio.create_task(welcome_email_worker())
    print("[OK] Welcome email worker started")
