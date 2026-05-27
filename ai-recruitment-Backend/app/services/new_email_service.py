"""
Centralized Email Service with Provider Abstraction.
Handles all TalentIQ communications: welcome, invitations, reminders.
"""
import os
from datetime import datetime
from typing import Optional, List, Dict, Any
import structlog
from app.services.providers.emailjs_provider import EmailJSProvider
from app.utils.ics_generator import generate_interview_ics

logger = structlog.get_logger()

class EmailService:
    """
    Business logic for emails. 
    Decoupled from actual delivery mechanism via Provider Abstraction.
    """
    
    def __init__(self, provider=None):
        # Default to EmailJSProvider if none provided
        self.provider = provider or EmailJSProvider()
        self.frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
        self.from_name = os.getenv('FROM_NAME', 'TalentIQ')
        self.from_email = os.getenv('FROM_EMAIL', 'noreply@talentiq.ai')

    async def _log_to_db(self, to: str, type: str, subject: str, result: Dict[str, Any], related_id: Optional[str] = None):
        """Log delivery result to database."""
        try:
            from app.database.session import AsyncSessionLocal
            from app.models.models import EmailActivityLog
            
            async with AsyncSessionLocal() as db:
                log = EmailActivityLog(
                    recipient_email=to,
                    email_type=type,
                    subject=subject,
                    status=result.get("status", "failed"),
                    error_message=result.get("error_message"),
                    provider_response=result.get("raw_response"),
                    related_entity_id=related_id,
                    sent_at=datetime.utcnow() if result.get("status") == "sent" else None
                )
                db.add(log)
                await db.commit()
        except Exception as e:
            logger.error("Failed to log email to DB", error=str(e))

    async def send_welcome_email(self, user_email: str, user_name: str, related_id: str = None):
        """Send professional welcome email to new recruiter."""
        subject = "🎉 Welcome to TalentIQ - Your AI-Powered Recruitment Journey Begins!"
        
        # We reuse the rich HTML from the previous implementation
        html_content = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
            <h2 style="color: #6366f1;">Welcome to TalentIQ, {user_name}!</h2>
            <p>We're thrilled to have you on board. TalentIQ helps you find the best talent faster using AI.</p>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">What you can do now:</h3>
                <ul>
                    <li>Create professional Job Descriptions with AI</li>
                    <li>Upload and analyze candidate resumes</li>
                    <li>Schedule AI-powered interviews</li>
                    <li>View match scores and insights</li>
                </ul>
            </div>
            <a href="{self.frontend_url}/dashboard" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Dashboard</a>
        </div>
        """
        
        result = await self.provider.send_email(user_email, subject, html_content)
        await self._log_to_db(user_email, "WELCOME_EMAIL", subject, result, related_id)
        return result

    async def send_interview_invitation_candidate(
        self, 
        candidate_email: str, 
        candidate_name: str,
        role_title: str,
        scheduled_at: datetime,
        duration: int,
        magic_link: str,
        recruiter_name: str,
        related_id: str = None
    ):
        """Send branded invitation to candidate with ICS attachment."""
        subject = f"Interview Invitation: {role_title} at TalentIQ"
        
        date_str = scheduled_at.strftime("%A, %B %d, %Y")
        time_str = scheduled_at.strftime("%I:%M %p UTC")

        # Generate ICS
        ics_b64 = generate_interview_ics(
            title=f"Interview: {role_title}",
            start_time=scheduled_at,
            duration_minutes=duration,
            description=f"AI Interview for {role_title}. Join via: {magic_link}",
            location="TalentIQ Virtual Lobby",
            organizer_name=recruiter_name,
            organizer_email=self.from_email
        )

        attachments = [{
            "name": "invite.ics",
            "content": ics_b64,
            "type": "text/calendar"
        }]

        html_content = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
            <h2 style="color: #6366f1;">Interview Invitation</h2>
            <p>Hi {candidate_name},</p>
            <p>You have been invited to an AI-powered interview for the <strong>{role_title}</strong> position.</p>
            
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>📅 Date:</strong> {date_str}</p>
                <p><strong>🕒 Time:</strong> {time_str}</p>
                <p><strong>⏱️ Duration:</strong> {duration} minutes</p>
                <p><strong>👤 Recruiter:</strong> {recruiter_name}</p>
            </div>

            <p>You can join the interview lobby directly using the link below. No registration required.</p>
            <a href="{magic_link}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Join Interview Lobby</a>
            
            <p style="font-size: 12px; color: #666; margin-top: 20px;">We have attached a calendar invitation to this email for your convenience.</p>
        </div>
        """

        result = await self.provider.send_email(
            candidate_email, subject, html_content, 
            attachments=attachments
        )
        await self._log_to_db(candidate_email, "INTERVIEW_INVITATION", subject, result, related_id)
        return result

    async def send_interview_invitation_recruiter(
        self, 
        recruiter_email: str, 
        recruiter_name: str,
        candidate_name: str,
        role_title: str,
        scheduled_at: datetime,
        duration: int,
        dashboard_link: str,
        related_id: str = None
    ):
        """Send confirmation to recruiter with ICS attachment."""
        subject = f"Interview Scheduled: {candidate_name} for {role_title}"
        
        date_str = scheduled_at.strftime("%A, %B %d, %Y")
        time_str = scheduled_at.strftime("%I:%M %p UTC")

        # Generate ICS
        ics_b64 = generate_interview_ics(
            title=f"Interview {candidate_name}: {role_title}",
            start_time=scheduled_at,
            duration_minutes=duration,
            description=f"Interview with {candidate_name} for {role_title}.",
            location="TalentIQ Dashboard",
            organizer_name="TalentIQ",
            organizer_email=self.from_email
        )

        attachments = [{
            "name": "invite.ics",
            "content": ics_b64,
            "type": "text/calendar"
        }]

        html_content = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
            <h2 style="color: #059669;">Interview Scheduled Successfully</h2>
            <p>Hi {recruiter_name},</p>
            <p>Your interview with <strong>{candidate_name}</strong> for the <strong>{role_title}</strong> role has been confirmed.</p>
            
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>📅 Date:</strong> {date_str}</p>
                <p><strong>🕒 Time:</strong> {time_str}</p>
                <p><strong>👤 Candidate:</strong> {candidate_name}</p>
            </div>

            <a href="{dashboard_link}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View in Dashboard</a>
        </div>
        """

        result = await self.provider.send_email(
            recruiter_email, subject, html_content, 
            attachments=attachments
        )
        await self._log_to_db(recruiter_email, "INTERVIEW_INVITATION_RECRUITER", subject, result, related_id)
        return result

    async def send_interview_reminder(
        self,
        to_email: str,
        name: str,
        role_title: str,
        time_remaining_str: str,
        link: str,
        is_candidate: bool = True,
        related_id: str = None
    ):
        """Send automated reminder (24h, 1h, 30m, 15m)."""
        subject = f"⏰ Reminder: Interview for {role_title} in {time_remaining_str}"
        
        target_role = "your upcoming interview" if is_candidate else f"your interview with a candidate"
        
        html_content = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
            <h2 style="color: #d97706;">Interview Starting Soon</h2>
            <p>Hi {name},</p>
            <p>This is a reminder that {target_role} for <strong>{role_title}</strong> starts in <strong>{time_remaining_str}</strong>.</p>
            
            <a href="{link}" style="display: inline-block; background: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Join Now</a>
        </div>
        """

        result = await self.provider.send_email(to_email, subject, html_content)
        await self._log_to_db(to_email, "INTERVIEW_REMINDER", subject, result, related_id)
        return result

_new_email_service = None

def get_new_email_service() -> EmailService:
    global _new_email_service
    if _new_email_service is None:
        _new_email_service = EmailService()
    return _new_email_service
