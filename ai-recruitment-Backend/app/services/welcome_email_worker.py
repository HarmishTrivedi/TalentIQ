"""
Background Email Worker
Sends welcome emails to newly registered recruiters only.
Never fires for existing users or during interview scheduling.
"""
import asyncio
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, and_
from app.database import AsyncSessionLocal
from app.models.models import User
from app.services.new_email_service import get_new_email_service


async def send_pending_welcome_emails():
    """Send welcome emails ONLY to newly registered recruiters (created within last 1 hour)."""
    try:
        async with AsyncSessionLocal() as db:
            # STRICT CUTOFF: Only newly registered users within the last 60 minutes.
            # This ensures that old recruiters NEVER get a welcome email if the server restarts.
            cutoff = datetime.now(timezone.utc) - timedelta(hours=1)

            result = await db.execute(
                select(User)
                .where(
                    and_(
                        User.welcome_email_sent == False,
                        User.role == 'recruiter',
                        User.created_at >= cutoff.replace(tzinfo=None),
                    )
                )
                .limit(20)
            )
            users = result.scalars().all()

            if not users:
                return

            email_service = get_new_email_service()

            for user in users:
                try:
                    print(f"[EMAIL] Sending welcome email to new recruiter: {user.email}")
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
    """Run welcome email worker every 60 seconds."""
    while True:
        try:
            await send_pending_welcome_emails()
        except Exception as e:
            print(f"[ERROR] Worker error: {str(e)}")
        await asyncio.sleep(60)


def start_welcome_email_worker():
    """Start the welcome email worker in background."""
    asyncio.create_task(welcome_email_worker())
    print("[OK] Welcome email worker started")
