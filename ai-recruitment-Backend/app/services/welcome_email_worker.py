"""
Background Email Worker
Sends welcome emails to new users without blocking registration/OAuth
"""
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.models import User
from app.services.email_service import get_email_service


async def send_pending_welcome_emails():
    """Find users who need welcome emails and send them"""
    try:
        async with AsyncSessionLocal() as db:
            # Find users created in last 5 minutes who haven't received welcome email
            five_min_ago = datetime.utcnow() - timedelta(minutes=5)
            
            result = await db.execute(
                select(User)
                .where(User.welcome_email_sent == False)
                .where(User.created_at >= five_min_ago)
            )
            users = result.scalars().all()
            
            if not users:
                return
            
            email_service = get_email_service()
            
            for user in users:
                try:
                    print(f"📧 Sending welcome email to: {user.email}")
                    success = email_service.send_welcome_email(
                        recruiter_email=user.email,
                        recruiter_name=user.full_name,
                        company_name=user.company_name if hasattr(user, 'company_name') else None
                    )
                    
                    if success:
                        user.welcome_email_sent = True
                        await db.commit()
                        print(f"✅ Welcome email sent: {user.email}")
                    else:
                        print(f"❌ Welcome email failed: {user.email}")
                        
                except Exception as e:
                    print(f"❌ Error sending welcome email to {user.email}: {str(e)}")
                    
    except Exception as e:
        print(f"❌ Welcome email worker error: {str(e)}")


async def welcome_email_worker():
    """Run welcome email worker every 30 seconds"""
    while True:
        try:
            await send_pending_welcome_emails()
        except Exception as e:
            print(f"❌ Worker error: {str(e)}")
        
        # Wait 30 seconds before next check
        await asyncio.sleep(30)


def start_welcome_email_worker():
    """Start the welcome email worker in background"""
    asyncio.create_task(welcome_email_worker())
    print("✅ Welcome email worker started")
