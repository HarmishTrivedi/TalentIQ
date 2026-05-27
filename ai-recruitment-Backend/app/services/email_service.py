"""
DEPRECATED: Old Email Service.
This service is replaced by new_email_service.py which uses the Provider Abstraction.
Kept temporarily for backward compatibility with existing imports.
"""
from app.services.new_email_service import get_new_email_service

class EmailService:
    """Wrapper class to redirect old calls to the new provider-based service."""
    
    def __init__(self):
        self.new_service = get_new_email_service()

    def send_welcome_email(self, recruiter_email: str, recruiter_name: str, **kwargs):
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            return loop.create_task(self.new_service.send_welcome_email(recruiter_email, recruiter_name))
        else:
            return asyncio.run(self.new_service.send_welcome_email(recruiter_email, recruiter_name))

_email_service = None

def get_email_service() -> EmailService:
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
