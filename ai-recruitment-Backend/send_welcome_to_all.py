"""
Send welcome emails to all registered users
"""
import asyncio
from app.database import AsyncSessionLocal
from app.models.models import User
from sqlalchemy import select
from app.services.email_service import get_email_service

async def send_to_all_users():
    async with AsyncSessionLocal() as db:
        # Get all recruiters
        result = await db.execute(select(User).where(User.role == 'recruiter'))
        users = result.scalars().all()
        
        es = get_email_service()
        print(f'Found {len(users)} registered recruiters\n')
        print('=' * 80)
        
        sent = 0
        failed = 0
        
        for user in users:
            if user.email:
                try:
                    print(f'\nSending to: {user.email} ({user.full_name})')
                    success = es.send_welcome_email(
                        user.email, 
                        user.full_name,
                        user.company_name if hasattr(user, 'company_name') else None
                    )
                    
                    if success:
                        sent += 1
                        print(f'  [OK] Email sent successfully')
                    else:
                        failed += 1
                        print(f'  [FAILED] Email not sent')
                        
                except Exception as e:
                    failed += 1
                    print(f'  [ERROR] {e}')
        
        print('\n' + '=' * 80)
        print(f'\nSummary:')
        print(f'  Total users: {len(users)}')
        print(f'  Sent: {sent}')
        print(f'  Failed: {failed}')
        print('=' * 80)

if __name__ == '__main__':
    asyncio.run(send_to_all_users())
