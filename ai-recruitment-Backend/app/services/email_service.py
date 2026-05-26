"""
Email Notification Service for Interview System
Handles interview invitations, reminders, and confirmations
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional
import os
import asyncio
import time

class EmailService:
    """Email service for interview notifications with DB logging and retry queue"""
    
    def __init__(self):
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_user = os.getenv('SMTP_USER', '')
        self.smtp_password = os.getenv('SMTP_PASSWORD', '')
        self.from_email = os.getenv('FROM_EMAIL', 'noreply@talentiq.ai')
        self.from_name = os.getenv('FROM_NAME', 'TalentIQ')
        self.frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    
    async def _log_email_to_db(self, recipient_email: str, email_type: str, subject: str, status: str, failure_reason: str = None, related_entity_id: str = None):
        """Log email activity to database asynchronously"""
        try:
            from app.database import AsyncSessionLocal
            from app.models.models import EmailActivityLog
            
            async with AsyncSessionLocal() as db:
                log_entry = EmailActivityLog(
                    recipient_email=recipient_email,
                    email_type=email_type,
                    subject=subject,
                    status=status,
                    failure_reason=failure_reason,
                    related_entity_id=related_entity_id,
                    sent_at=datetime.utcnow() if status == 'sent' else None
                )
                db.add(log_entry)
                await db.commit()
                print(f"📧 Email logged to DB: {email_type} to {recipient_email} - {status}")
        except Exception as e:
            print(f"⚠️ Failed to log email to database: {e}")
    
    def send_email_with_retry(self, to_email: str, subject: str, html_content: str, text_content: str = None, email_type: str = "general", related_entity_id: str = None, max_retries: int = 3):
        """Send email with retry logic and exponential backoff"""
        for attempt in range(max_retries):
            try:
                msg = MIMEMultipart('alternative')
                msg['Subject'] = subject
                msg['From'] = f"{self.from_name} <{self.from_email}>"
                msg['To'] = to_email
                
                if text_content:
                    msg.attach(MIMEText(text_content, 'plain'))
                msg.attach(MIMEText(html_content, 'html'))
                
                # Add timeout to prevent hanging
                with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=10) as server:
                    server.starttls()
                    if self.smtp_user and self.smtp_password:
                        server.login(self.smtp_user, self.smtp_password)
                    server.send_message(msg)
                
                print(f"✅ Email sent successfully to {to_email}")
                
                # Log success to DB asynchronously
                asyncio.create_task(self._log_email_to_db(to_email, email_type, subject, 'sent', related_entity_id=related_entity_id))
                return True
                
            except smtplib.SMTPException as e:
                error_msg = f"SMTP error (attempt {attempt + 1}/{max_retries}): {e}"
                print(f"❌ {error_msg}")
                
                if attempt < max_retries - 1:
                    # Exponential backoff: 2^attempt seconds
                    wait_time = 2 ** attempt
                    print(f"⏳ Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    # Final failure - log to DB
                    asyncio.create_task(self._log_email_to_db(to_email, email_type, subject, 'failed', failure_reason=error_msg, related_entity_id=related_entity_id))
                    return False
                    
            except Exception as e:
                error_msg = f"Email send failed (attempt {attempt + 1}/{max_retries}): {e}"
                print(f"❌ {error_msg}")
                
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt
                    print(f"⏳ Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    asyncio.create_task(self._log_email_to_db(to_email, email_type, subject, 'failed', failure_reason=error_msg, related_entity_id=related_entity_id))
                    return False
        
        return False
    
    def send_email(self, to_email: str, subject: str, html_content: str, text_content: str = None, email_type: str = "general", related_entity_id: str = None):
        """Send email via SMTP with timeout protection and activity logging"""
        return self.send_email_with_retry(to_email, subject, html_content, text_content, email_type, related_entity_id)
    
    def send_interview_invitation(
        self,
        candidate_email: str,
        candidate_name: str,
        interview_title: str,
        scheduled_at: datetime,
        duration: int,
        meeting_link: str,
        recruiter_name: str = "TalentIQ Team",
        description: str = ""
    ):
        """Send interview invitation to candidate"""
        
        date_str = scheduled_at.strftime("%A, %B %d, %Y")
        time_str = scheduled_at.strftime("%I:%M %p")
        
        subject = f"Interview Invitation: {interview_title}"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; background: #0a0b14; }}
        .container {{ max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1d4ed8, #7c3aed); padding: 40px 20px; }}
        .card {{ background: rgba(255,255,255,0.98); border-radius: 20px; padding: 40px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }}
        .logo {{ text-align: center; margin-bottom: 30px; }}
        .logo-text {{ font-size: 32px; font-weight: 800; background: linear-gradient(135deg, #1d4ed8, #7c3aed); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
        h1 {{ color: #1d4ed8; font-size: 28px; margin-bottom: 10px; }}
        .subtitle {{ color: #64748b; font-size: 16px; margin-bottom: 30px; }}
        .info-box {{ background: #f1f5f9; border-left: 4px solid #1d4ed8; padding: 20px; margin: 20px 0; border-radius: 8px; }}
        .info-row {{ display: flex; justify-content: space-between; margin: 10px 0; }}
        .info-label {{ color: #64748b; font-weight: 600; }}
        .info-value {{ color: #0f172a; font-weight: 700; }}
        .button {{ display: inline-block; background: linear-gradient(135deg, #1d4ed8, #7c3aed); color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: 700; margin: 20px 0; box-shadow: 0 4px 20px rgba(29,78,216,0.3); }}
        .button:hover {{ box-shadow: 0 6px 30px rgba(29,78,216,0.5); }}
        .description {{ background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 8px; color: #78350f; }}
        .footer {{ text-align: center; color: #94a3b8; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }}
        .tips {{ background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 8px; }}
        .tips-title {{ color: #1e40af; font-weight: 700; margin-bottom: 10px; }}
        .tips ul {{ margin: 0; padding-left: 20px; color: #1e3a8a; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="logo">
                <div class="logo-text">✨ TalentIQ</div>
            </div>
            
            <h1>You're Invited to an Interview!</h1>
            <p class="subtitle">Hi {candidate_name}, we're excited to meet you!</p>
            
            <div class="info-box">
                <div class="info-row">
                    <span class="info-label">📅 Date:</span>
                    <span class="info-value">{date_str}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">🕐 Time:</span>
                    <span class="info-value">{time_str}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">⏱️ Duration:</span>
                    <span class="info-value">{duration} minutes</span>
                </div>
                <div class="info-row">
                    <span class="info-label">👤 Interviewer:</span>
                    <span class="info-value">{recruiter_name}</span>
                </div>
            </div>
            
            {f'<div class="description"><strong>About this interview:</strong><br>{description}</div>' if description else ''}
            
            <div style="text-align: center;">
                <a href="{meeting_link}" class="button">🎥 Join Interview</a>
            </div>
            
            <div class="tips">
                <div class="tips-title">💡 Interview Tips:</div>
                <ul>
                    <li>Test your camera and microphone before the interview</li>
                    <li>Join 5 minutes early to ensure everything works</li>
                    <li>Find a quiet, well-lit space</li>
                    <li>Have your resume and portfolio ready</li>
                    <li>Prepare questions about the role and company</li>
                </ul>
            </div>
            
            <div class="footer">
                <p>This is an automated invitation from TalentIQ AI Recruitment Platform</p>
                <p>If you have any questions, please reply to this email</p>
                <p style="margin-top: 20px; color: #cbd5e1;">
                    <a href="{self.frontend_url}" style="color: #1d4ed8; text-decoration: none;">Visit TalentIQ</a>
                </p>
            </div>
        </div>
    </div>
</body>
</html>
"""
        
        text_content = f"""
Interview Invitation: {interview_title}

Hi {candidate_name},

You're invited to an interview!

Date: {date_str}
Time: {time_str}
Duration: {duration} minutes
Interviewer: {recruiter_name}

Join the interview: {meeting_link}

{description}

Tips:
- Test your camera and microphone before the interview
- Join 5 minutes early
- Find a quiet, well-lit space

Best regards,
TalentIQ Team
"""
        
        return self.send_email(candidate_email, subject, html_content, text_content)
    
    def send_interview_reminder(
        self,
        candidate_email: str,
        candidate_name: str,
        interview_title: str,
        scheduled_at: datetime,
        meeting_link: str,
        recruiter_name: str = "TalentIQ Team"
    ):
        """Send interview reminder 30 minutes before to candidate"""
        
        date_str = scheduled_at.strftime("%A, %B %d, %Y")
        time_str = scheduled_at.strftime("%I:%M %p")
        
        subject = f"⏰ Reminder: Interview in 30 Minutes - {interview_title}"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; background: #0a0b14; }}
        .container {{ max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 40px 20px; }}
        .card {{ background: white; border-radius: 20px; padding: 40px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }}
        .logo {{ text-align: center; margin-bottom: 20px; }}
        .logo-text {{ font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #f59e0b, #ef4444); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
        h1 {{ color: #dc2626; font-size: 28px; margin-bottom: 10px; text-align: center; }}
        .subtitle {{ color: #64748b; font-size: 16px; margin-bottom: 20px; text-align: center; }}
        .time-box {{ background: linear-gradient(135deg, #fef3c7, #fed7aa); border: 3px solid #f59e0b; padding: 25px; margin: 25px 0; border-radius: 16px; text-align: center; box-shadow: 0 4px 15px rgba(245,158,11,0.2); }}
        .time-box .label {{ font-size: 14px; color: #92400e; font-weight: 600; margin-bottom: 8px; }}
        .time-box .time {{ font-size: 42px; font-weight: 900; color: #dc2626; margin: 10px 0; }}
        .time-box .date {{ font-size: 16px; color: #78350f; font-weight: 600; margin-top: 8px; }}
        .info-box {{ background: #f1f5f9; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 8px; }}
        .info-row {{ margin: 10px 0; color: #334155; }}
        .info-label {{ font-weight: 700; color: #1e293b; }}
        .button {{ display: inline-block; background: linear-gradient(135deg, #dc2626, #f59e0b); color: white; padding: 18px 50px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 18px; margin: 20px 0; box-shadow: 0 6px 25px rgba(220,38,38,0.4); transition: all 0.3s; }}
        .button:hover {{ box-shadow: 0 8px 35px rgba(220,38,38,0.6); transform: translateY(-2px); }}
        .checklist {{ background: #dbeafe; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #3b82f6; }}
        .checklist-title {{ color: #1e40af; font-weight: 700; margin-bottom: 12px; font-size: 16px; }}
        .checklist-item {{ margin: 10px 0; color: #1e3a8a; font-size: 15px; padding-left: 5px; }}
        .urgent-note {{ background: #fee2e2; border: 2px solid #ef4444; padding: 15px; border-radius: 10px; margin: 20px 0; text-align: center; }}
        .urgent-note p {{ margin: 5px 0; color: #991b1b; font-weight: 600; }}
        .footer {{ text-align: center; color: #94a3b8; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="logo">
                <div class="logo-text">⏰ TalentIQ</div>
            </div>
            
            <h1>Interview Starting Soon!</h1>
            <p class="subtitle">Hi {candidate_name}, your interview is about to begin</p>
            
            <div class="urgent-note">
                <p style="font-size: 18px; margin: 0;">🚨 Your interview starts in <strong>30 MINUTES</strong></p>
            </div>
            
            <div class="time-box">
                <div class="label">INTERVIEW TIME</div>
                <div class="time">{time_str}</div>
                <div class="date">{date_str}</div>
            </div>
            
            <div class="info-box">
                <div class="info-row">
                    <span class="info-label">📋 Interview:</span> {interview_title}
                </div>
                <div class="info-row">
                    <span class="info-label">👤 Interviewer:</span> {recruiter_name}
                </div>
            </div>
            
            <div style="text-align: center;">
                <a href="{meeting_link}" class="button">🎥 JOIN INTERVIEW NOW</a>
            </div>
            
            <div class="checklist">
                <div class="checklist-title">✅ Quick Pre-Interview Checklist:</div>
                <div class="checklist-item">✓ Camera is working and positioned correctly</div>
                <div class="checklist-item">✓ Microphone is tested and clear</div>
                <div class="checklist-item">✓ Quiet, well-lit environment ready</div>
                <div class="checklist-item">✓ Resume and notes prepared</div>
                <div class="checklist-item">✓ Professional attire</div>
                <div class="checklist-item">✓ Questions for the interviewer ready</div>
            </div>
            
            <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 8px; text-align: center;">
                <p style="margin: 0; color: #065f46; font-weight: 600;">💡 Pro Tip: Join 5 minutes early to test your setup!</p>
            </div>
            
            <div class="footer">
                <p style="font-weight: 600; color: #64748b;">Good luck! You've got this! 🚀</p>
                <p style="margin-top: 15px;">This is an automated reminder from TalentIQ AI Recruitment Platform</p>
                <p style="margin-top: 20px; color: #cbd5e1;">
                    <a href="{self.frontend_url}" style="color: #dc2626; text-decoration: none; font-weight: 600;">Visit TalentIQ</a>
                </p>
            </div>
        </div>
    </div>
</body>
</html>
"""
        
        text_content = f"""
REMINDER: Interview in 30 Minutes!

Hi {candidate_name},

Your interview is starting in 30 MINUTES!

Interview: {interview_title}
Date: {date_str}
Time: {time_str}
Interviewer: {recruiter_name}

Join the interview: {meeting_link}

Quick Checklist:
- Camera working
- Microphone tested
- Quiet environment
- Resume ready
- Professional attire

Join 5 minutes early to test your setup!

Good luck!
TalentIQ Team
"""
        
        return self.send_email(candidate_email, subject, html_content, text_content)
    
    def send_recruiter_interview_reminder(
        self,
        recruiter_email: str,
        recruiter_name: str,
        candidate_name: str,
        interview_title: str,
        scheduled_at: datetime,
        meeting_link: str,
        candidate_email: str = None
    ):
        """Send interview reminder 30 minutes before to recruiter"""
        
        date_str = scheduled_at.strftime("%A, %B %d, %Y")
        time_str = scheduled_at.strftime("%I:%M %p")
        
        subject = f"⏰ Reminder: Interview in 30 Minutes with {candidate_name}"
        
        candidate_info = ""
        if candidate_email:
            candidate_info = f"<p><strong>📧 Candidate Email:</strong> {candidate_email}</p>"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; background: #0a0b14; }}
        .container {{ max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #10b981, #3b82f6); padding: 40px 20px; }}
        .card {{ background: white; border-radius: 20px; padding: 40px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }}
        .logo {{ text-align: center; margin-bottom: 20px; }}
        .logo-text {{ font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #10b981, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
        h1 {{ color: #059669; font-size: 28px; margin-bottom: 10px; text-align: center; }}
        .subtitle {{ color: #64748b; font-size: 16px; margin-bottom: 20px; text-align: center; }}
        .time-box {{ background: linear-gradient(135deg, #d1fae5, #bfdbfe); border: 3px solid #10b981; padding: 25px; margin: 25px 0; border-radius: 16px; text-align: center; box-shadow: 0 4px 15px rgba(16,185,129,0.2); }}
        .time-box .label {{ font-size: 14px; color: #065f46; font-weight: 600; margin-bottom: 8px; }}
        .time-box .time {{ font-size: 42px; font-weight: 900; color: #059669; margin: 10px 0; }}
        .time-box .date {{ font-size: 16px; color: #047857; font-weight: 600; margin-top: 8px; }}
        .info-box {{ background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px; }}
        .info-box p {{ margin: 8px 0; color: #334155; }}
        .info-label {{ font-weight: 700; color: #1e293b; }}
        .button {{ display: inline-block; background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 18px 50px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 18px; margin: 20px 0; box-shadow: 0 6px 25px rgba(16,185,129,0.4); transition: all 0.3s; }}
        .button:hover {{ box-shadow: 0 8px 35px rgba(16,185,129,0.6); transform: translateY(-2px); }}
        .checklist {{ background: #fef3c7; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #f59e0b; }}
        .checklist-title {{ color: #92400e; font-weight: 700; margin-bottom: 12px; font-size: 16px; }}
        .checklist-item {{ margin: 10px 0; color: #78350f; font-size: 15px; padding-left: 5px; }}
        .urgent-note {{ background: #dbeafe; border: 2px solid #3b82f6; padding: 15px; border-radius: 10px; margin: 20px 0; text-align: center; }}
        .urgent-note p {{ margin: 5px 0; color: #1e40af; font-weight: 600; }}
        .footer {{ text-align: center; color: #94a3b8; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="logo">
                <div class="logo-text">⏰ TalentIQ</div>
            </div>
            
            <h1>Interview Starting Soon!</h1>
            <p class="subtitle">Hi {recruiter_name}, your interview is about to begin</p>
            
            <div class="urgent-note">
                <p style="font-size: 18px; margin: 0;">🎯 Interview starts in <strong>30 MINUTES</strong></p>
            </div>
            
            <div class="time-box">
                <div class="label">INTERVIEW TIME</div>
                <div class="time">{time_str}</div>
                <div class="date">{date_str}</div>
            </div>
            
            <div class="info-box">
                <p><strong>📋 Interview:</strong> {interview_title}</p>
                <p><strong>👤 Candidate:</strong> {candidate_name}</p>
                {candidate_info}
            </div>
            
            <div style="text-align: center;">
                <a href="{meeting_link}" class="button">🎥 START INTERVIEW</a>
            </div>
            
            <div class="checklist">
                <div class="checklist-title">📝 Interviewer Preparation:</div>
                <div class="checklist-item">✓ Review candidate's profile and resume</div>
                <div class="checklist-item">✓ Prepare interview questions</div>
                <div class="checklist-item">✓ Test camera and microphone</div>
                <div class="checklist-item">✓ Have evaluation criteria ready</div>
                <div class="checklist-item">✓ Quiet, professional environment</div>
            </div>
            
            <div style="background: #e0e7ff; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #3730a3; font-weight: 600;">💡 The candidate has been notified and will be joining soon!</p>
            </div>
            
            <div class="footer">
                <p style="font-weight: 600; color: #64748b;">Good luck with the interview! 🚀</p>
                <p style="margin-top: 15px;">This is an automated reminder from TalentIQ AI Recruitment Platform</p>
                <p style="margin-top: 20px; color: #cbd5e1;">
                    <a href="{self.frontend_url}" style="color: #059669; text-decoration: none; font-weight: 600;">Visit TalentIQ Dashboard</a>
                </p>
            </div>
        </div>
    </div>
</body>
</html>
"""
        
        text_content = f"""
REMINDER: Interview in 30 Minutes!

Hi {recruiter_name},

Your interview is starting in 30 MINUTES!

Interview: {interview_title}
Candidate: {candidate_name}
Date: {date_str}
Time: {time_str}

Start the interview: {meeting_link}

Preparation Checklist:
- Review candidate's profile
- Prepare interview questions
- Test camera and microphone
- Have evaluation criteria ready

The candidate has been notified!

Good luck!
TalentIQ Team
"""
        
        return self.send_email(recruiter_email, subject, html_content, text_content)
    
    def send_recruiter_interview_invitation(
        self,
        recruiter_email: str,
        recruiter_name: str,
        candidate_name: str,
        interview_title: str,
        scheduled_at: datetime,
        duration: int,
        meeting_link: str,
        candidate_email: str = None
    ):
        """Send interview invitation to recruiter with join button"""
        
        date_str = scheduled_at.strftime("%A, %B %d, %Y")
        time_str = scheduled_at.strftime("%I:%M %p")
        
        subject = f"Interview Scheduled: {candidate_name} - {interview_title}"
        
        candidate_info = ""
        if candidate_email:
            candidate_info = f"<p><strong>📧 Candidate Email:</strong> {candidate_email}</p>"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; background: #0a0b14; }}
        .container {{ max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #10b981, #3b82f6); padding: 40px 20px; }}
        .card {{ background: white; border-radius: 20px; padding: 40px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }}
        .logo {{ text-align: center; margin-bottom: 30px; }}
        .logo-text {{ font-size: 32px; font-weight: 800; background: linear-gradient(135deg, #10b981, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
        h1 {{ color: #059669; font-size: 28px; margin-bottom: 10px; }}
        .subtitle {{ color: #64748b; font-size: 16px; margin-bottom: 30px; }}
        .info-box {{ background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px; }}
        .info-box p {{ margin: 8px 0; color: #334155; }}
        .info-label {{ font-weight: 700; color: #1e293b; }}
        .button {{ display: inline-block; background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: 700; margin: 20px 0; box-shadow: 0 4px 20px rgba(16,185,129,0.3); }}
        .button:hover {{ box-shadow: 0 6px 30px rgba(16,185,129,0.5); }}
        .footer {{ text-align: center; color: #94a3b8; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="logo">
                <div class="logo-text">✨ TalentIQ</div>
            </div>
            
            <h1>✅ Interview Scheduled Successfully</h1>
            <p class="subtitle">Hi {recruiter_name}, your interview has been confirmed!</p>
            
            <div class="info-box">
                <p><strong>📅 Date:</strong> {date_str}</p>
                <p><strong>🕐 Time:</strong> {time_str}</p>
                <p><strong>⏱️ Duration:</strong> {duration} minutes</p>
                <p><strong>📄 Interview:</strong> {interview_title}</p>
                <p><strong>👤 Candidate:</strong> {candidate_name}</p>
                {candidate_info}
            </div>
            
            <div style="text-align: center;">
                <a href="{meeting_link}" class="button">🎥 Join Interview</a>
            </div>
            
            <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #1e40af; font-weight: 600;">📧 The candidate has been notified and will receive a reminder 30 minutes before the interview.</p>
            </div>
            
            <div class="footer">
                <p>This is an automated invitation from TalentIQ AI Recruitment Platform</p>
                <p style="margin-top: 20px; color: #cbd5e1;">
                    <a href="{self.frontend_url}" style="color: #059669; text-decoration: none;">Visit TalentIQ Dashboard</a>
                </p>
            </div>
        </div>
    </div>
</body>
</html>
"""
        
        text_content = f"""
Interview Scheduled: {candidate_name} - {interview_title}

Hi {recruiter_name},

Your interview has been confirmed!

Date: {date_str}
Time: {time_str}
Duration: {duration} minutes
Candidate: {candidate_name}

Join the interview: {meeting_link}

The candidate has been notified and will receive a reminder 30 minutes before.

Best regards,
TalentIQ Team
"""
        
        return self.send_email(recruiter_email, subject, html_content, text_content, email_type="interview_invitation")
    
    def send_recruiter_confirmation(
        self,
        recruiter_email: str,
        recruiter_name: str,
        candidate_name: str,
        interview_title: str,
        scheduled_at: datetime,
        meeting_link: str
    ):
        """Send confirmation to recruiter"""
        
        date_str = scheduled_at.strftime("%A, %B %d, %Y at %I:%M %p")
        
        subject = f"Interview Scheduled: {candidate_name} - {interview_title}"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: 'Inter', sans-serif; margin: 0; padding: 0; background: #0a0b14; }}
        .container {{ max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #10b981, #3b82f6); padding: 40px 20px; }}
        .card {{ background: white; border-radius: 20px; padding: 40px; }}
        h1 {{ color: #059669; font-size: 24px; }}
        .info-box {{ background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px; }}
        .button {{ display: inline-block; background: linear-gradient(135deg, #10b981, #3b82f6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <h1>✅ Interview Scheduled Successfully</h1>
            <p>Hi {recruiter_name},</p>
            <p>Your interview with <strong>{candidate_name}</strong> has been scheduled.</p>
            
            <div class="info-box">
                <p><strong>Interview:</strong> {interview_title}</p>
                <p><strong>Candidate:</strong> {candidate_name}</p>
                <p><strong>When:</strong> {date_str}</p>
            </div>
            
            <div style="text-align: center;">
                <a href="{meeting_link}" class="button">Start Interview</a>
            </div>
            
            <p style="color: #64748b; margin-top: 30px; font-size: 14px;">
                The candidate has been notified and will receive a reminder 30 minutes before the interview.
            </p>
        </div>
    </div>
</body>
</html>
"""
        
        return self.send_email(recruiter_email, subject, html_content)
    
    def send_candidate_application_confirmation(
        self,
        candidate_email: str,
        candidate_name: str,
        skills: list = None,
        experience_years: float = 0.0
    ):
        """Send confirmation to candidate when CV is uploaded"""
        
        subject = f"Application Received - {candidate_name}"
        
        skills_html = ""
        if skills:
            skills_list = ", ".join(skills[:10]) if len(skills) > 10 else ", ".join(skills)
            skills_html = f"""
            <div class="info-box">
                <p><strong>🎯 Detected Skills:</strong></p>
                <p style="color: #1e3a8a;">{skills_list}</p>
            </div>
            """
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: 'Inter', sans-serif; margin: 0; padding: 0; background: #0a0b14; }}
        .container {{ max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1d4ed8, #7c3aed); padding: 40px 20px; }}
        .card {{ background: white; border-radius: 20px; padding: 40px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }}
        .logo {{ text-align: center; margin-bottom: 30px; }}
        .logo-text {{ font-size: 32px; font-weight: 800; background: linear-gradient(135deg, #1d4ed8, #7c3aed); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }}
        h1 {{ color: #1d4ed8; font-size: 28px; margin-bottom: 10px; }}
        .subtitle {{ color: #64748b; font-size: 16px; margin-bottom: 30px; }}
        .info-box {{ background: #dbeafe; border-left: 4px solid #1d4ed8; padding: 20px; margin: 20px 0; border-radius: 8px; }}
        .success-box {{ background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px; }}
        .footer {{ text-align: center; color: #94a3b8; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="logo">
                <div class="logo-text">✨ TalentIQ</div>
            </div>
            
            <h1>🎉 Application Received Successfully!</h1>
            <p class="subtitle">Hi {candidate_name}, thank you for submitting your application!</p>
            
            <div class="success-box">
                <p style="margin: 0; color: #065f46; font-weight: 600;">✅ Your CV has been successfully processed by our AI system</p>
            </div>
            
            <div class="info-box">
                <p><strong>📊 Profile Summary:</strong></p>
                <p style="color: #1e3a8a; margin: 5px 0;">Experience: {experience_years} years</p>
            </div>
            
            {skills_html}
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #78350f;"><strong>📌 What's Next?</strong></p>
                <ul style="color: #78350f; margin: 10px 0;">
                    <li>Our AI is matching your profile with relevant opportunities</li>
                    <li>Recruiters will review your application</li>
                    <li>You'll be notified if there's a match</li>
                </ul>
            </div>
            
            <div class="footer">
                <p>This is an automated confirmation from TalentIQ AI Recruitment Platform</p>
                <p>If you have any questions, please reply to this email</p>
                <p style="margin-top: 20px; color: #cbd5e1;">
                    <a href="{self.frontend_url}" style="color: #1d4ed8; text-decoration: none;">Visit TalentIQ</a>
                </p>
            </div>
        </div>
    </div>
</body>
</html>
"""
        
        return self.send_email(candidate_email, subject, html_content)
    
    def send_recruiter_new_candidate_notification(
        self,
        recruiter_email: str,
        recruiter_name: str,
        candidate_name: str,
        candidate_email: str,
        skills: list = None,
        experience_years: float = 0.0,
        summary: str = None
    ):
        """Send notification to recruiter when new candidate CV is uploaded"""
        
        subject = f"New Candidate Application: {candidate_name}"
        
        skills_html = ""
        if skills:
            skills_list = ", ".join(skills[:15]) if len(skills) > 15 else ", ".join(skills)
            skills_html = f"""
            <div class="skills-box">
                <p><strong>💼 Key Skills:</strong></p>
                <p style="color: #1e3a8a;">{skills_list}</p>
            </div>
            """
        
        summary_html = ""
        if summary:
            summary_html = f"""
            <div class="summary-box">
                <p><strong>📝 Professional Summary:</strong></p>
                <p style="color: #334155;">{summary[:300]}{'...' if len(summary) > 300 else ''}</p>
            </div>
            """
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: 'Inter', sans-serif; margin: 0; padding: 0; background: #0a0b14; }}
        .container {{ max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #7c3aed, #ec4899); padding: 40px 20px; }}
        .card {{ background: white; border-radius: 20px; padding: 40px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }}
        h1 {{ color: #7c3aed; font-size: 26px; margin-bottom: 10px; }}
        .info-box {{ background: #f3e8ff; border-left: 4px solid #7c3aed; padding: 20px; margin: 20px 0; border-radius: 8px; }}
        .skills-box {{ background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; border-radius: 8px; }}
        .summary-box {{ background: #f1f5f9; border-left: 4px solid #64748b; padding: 15px; margin: 15px 0; border-radius: 8px; }}
        .button {{ display: inline-block; background: linear-gradient(135deg, #7c3aed, #ec4899); color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: 700; margin: 20px 0; box-shadow: 0 4px 20px rgba(124,58,237,0.3); }}
        .footer {{ text-align: center; color: #94a3b8; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <h1>🆕 New Candidate Application</h1>
            <p>Hi {recruiter_name},</p>
            <p>A new candidate has submitted their application and is ready for review.</p>
            
            <div class="info-box">
                <p><strong>👤 Candidate:</strong> {candidate_name}</p>
                <p><strong>📧 Email:</strong> {candidate_email}</p>
                <p><strong>💼 Experience:</strong> {experience_years} years</p>
            </div>
            
            {skills_html}
            {summary_html}
            
            <div style="text-align: center;">
                <a href="{self.frontend_url}/candidates" class="button">View Candidate Profile</a>
            </div>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #78350f;">💡 <strong>Tip:</strong> Our AI has already processed and analyzed this candidate's profile. You can start matching them with open positions right away!</p>
            </div>
            
            <div class="footer">
                <p>This is an automated notification from TalentIQ AI Recruitment Platform</p>
                <p style="margin-top: 20px; color: #cbd5e1;">
                    <a href="{self.frontend_url}" style="color: #7c3aed; text-decoration: none;">Visit TalentIQ Dashboard</a>
                </p>
            </div>
        </div>
    </div>
</body>
</html>
"""
        
        return self.send_email(recruiter_email, subject, html_content)
    
    def send_welcome_email(
        self,
        recruiter_email: str,
        recruiter_name: str,
        company_name: str = None
    ):
        """Send stylish welcome email to new recruiter"""
        
        subject = f"🎉 Welcome to TalentIQ - Your AI-Powered Recruitment Journey Begins!"
        
        company_greeting = f" from {company_name}" if company_name else ""
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; background: #0a0b14; }}
        .container {{ max-width: 650px; margin: 0 auto; background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899); padding: 50px 20px; }}
        .card {{ background: white; border-radius: 24px; padding: 50px 40px; box-shadow: 0 25px 70px rgba(0,0,0,0.4); }}
        .logo-section {{ text-align: center; margin-bottom: 40px; }}
        .logo-text {{ font-size: 48px; font-weight: 900; background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -1px; }}
        .tagline {{ color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-top: 8px; }}
        h1 {{ color: #1e293b; font-size: 32px; margin-bottom: 15px; line-height: 1.2; }}
        .subtitle {{ color: #64748b; font-size: 18px; margin-bottom: 35px; line-height: 1.6; }}
        .welcome-box {{ background: linear-gradient(135deg, #f0f9ff, #fae8ff); border: 2px solid #c084fc; padding: 30px; margin: 30px 0; border-radius: 16px; text-align: center; }}
        .welcome-box h2 {{ color: #7c3aed; font-size: 24px; margin: 0 0 10px 0; }}
        .welcome-box p {{ color: #6b21a8; font-size: 16px; margin: 0; font-weight: 500; }}
        .features-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 35px 0; }}
        .feature-card {{ background: #f8fafc; border-left: 4px solid #6366f1; padding: 20px; border-radius: 12px; transition: all 0.3s; }}
        .feature-card:hover {{ background: #f1f5f9; transform: translateX(5px); }}
        .feature-icon {{ font-size: 28px; margin-bottom: 10px; }}
        .feature-title {{ color: #1e293b; font-weight: 700; font-size: 16px; margin-bottom: 8px; }}
        .feature-desc {{ color: #64748b; font-size: 14px; line-height: 1.5; }}
        .cta-section {{ text-align: center; margin: 40px 0; }}
        .button {{ display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 18px 45px; text-decoration: none; border-radius: 14px; font-weight: 700; font-size: 17px; margin: 10px; box-shadow: 0 8px 30px rgba(99,102,241,0.4); transition: all 0.3s; }}
        .button:hover {{ box-shadow: 0 12px 40px rgba(99,102,241,0.6); transform: translateY(-2px); }}
        .button-secondary {{ background: linear-gradient(135deg, #10b981, #3b82f6); box-shadow: 0 8px 30px rgba(16,185,129,0.4); }}
        .button-secondary:hover {{ box-shadow: 0 12px 40px rgba(16,185,129,0.6); }}
        .stats-box {{ background: linear-gradient(135deg, #fef3c7, #fed7aa); border: 2px solid #f59e0b; padding: 25px; margin: 30px 0; border-radius: 16px; }}
        .stats-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center; margin-top: 20px; }}
        .stat-item {{ }}
        .stat-number {{ font-size: 32px; font-weight: 900; color: #92400e; margin-bottom: 5px; }}
        .stat-label {{ font-size: 13px; color: #78350f; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }}
        .tips-section {{ background: #dbeafe; border-left: 4px solid #3b82f6; padding: 25px; margin: 30px 0; border-radius: 12px; }}
        .tips-title {{ color: #1e40af; font-weight: 700; font-size: 18px; margin-bottom: 15px; }}
        .tips-list {{ margin: 0; padding-left: 25px; }}
        .tips-list li {{ color: #1e3a8a; margin: 10px 0; font-size: 15px; line-height: 1.6; }}
        .support-box {{ background: #f0fdf4; border: 2px solid #10b981; padding: 25px; margin: 30px 0; border-radius: 16px; text-align: center; }}
        .support-box h3 {{ color: #065f46; font-size: 20px; margin: 0 0 10px 0; }}
        .support-box p {{ color: #047857; margin: 5px 0; font-size: 15px; }}
        .footer {{ text-align: center; color: #94a3b8; font-size: 14px; margin-top: 40px; padding-top: 30px; border-top: 2px solid #e2e8f0; }}
        .footer-links {{ margin: 20px 0; }}
        .footer-links a {{ color: #6366f1; text-decoration: none; margin: 0 15px; font-weight: 600; }}
        .social-links {{ margin: 20px 0; }}
        .social-links a {{ display: inline-block; margin: 0 10px; color: #8b5cf6; font-size: 24px; text-decoration: none; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="logo-section">
                <div class="logo-text">✨ TalentIQ</div>
                <div class="tagline">AI-Powered Recruitment Platform</div>
            </div>
            
            <h1>Welcome to the Future of Hiring{company_greeting}! 🚀</h1>
            <p class="subtitle">
                Hi <strong>{recruiter_name}</strong>, we're thrilled to have you on board! 
                Get ready to revolutionize your recruitment process with the power of AI.
            </p>
            
            <div class="welcome-box">
                <h2>🎉 Your Account is Ready!</h2>
                <p>You now have access to the most advanced AI recruitment platform</p>
            </div>
            
            <div class="stats-box">
                <h3 style="color: #92400e; font-size: 20px; margin: 0 0 15px 0; text-align: center;">🔥 Platform Capabilities</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-number">10x</div>
                        <div class="stat-label">Faster Hiring</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">95%</div>
                        <div class="stat-label">Match Accuracy</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">AI</div>
                        <div class="stat-label">Powered</div>
                    </div>
                </div>
            </div>
            
            <h2 style="color: #1e293b; font-size: 24px; margin: 35px 0 20px 0;">🎯 What You Can Do:</h2>
            
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">📄</div>
                    <div class="feature-title">Smart CV Analysis</div>
                    <div class="feature-desc">Upload CVs and let AI extract skills, experience, and insights instantly</div>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">🎯</div>
                    <div class="feature-title">AI Matching</div>
                    <div class="feature-desc">Match candidates to jobs with 95%+ accuracy using advanced algorithms</div>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">🎥</div>
                    <div class="feature-title">Live AI Interviews</div>
                    <div class="feature-desc">Conduct interviews with real-time AI analysis and fraud detection</div>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">💬</div>
                    <div class="feature-title">AI Assistant</div>
                    <div class="feature-desc">Chat with AI to get insights, generate questions, and make decisions</div>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">📊</div>
                    <div class="feature-title">Analytics Dashboard</div>
                    <div class="feature-desc">Track metrics, view insights, and optimize your hiring process</div>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">🤖</div>
                    <div class="feature-title">Auto JD Generation</div>
                    <div class="feature-desc">Create perfect job descriptions with AI in seconds</div>
                </div>
            </div>
            
            <div class="cta-section">
                <a href="{self.frontend_url}/dashboard" class="button">🚀 Go to Dashboard</a>
                <a href="{self.frontend_url}/upload" class="button button-secondary">📄 Upload First CV</a>
            </div>
            
            <div class="tips-section">
                <div class="tips-title">💡 Quick Start Guide:</div>
                <ul class="tips-list">
                    <li><strong>Step 1:</strong> Upload candidate CVs or create job descriptions</li>
                    <li><strong>Step 2:</strong> Let AI analyze and match candidates to positions</li>
                    <li><strong>Step 3:</strong> Schedule AI-powered interviews with one click</li>
                    <li><strong>Step 4:</strong> Review AI-generated insights and make informed decisions</li>
                    <li><strong>Step 5:</strong> Track your hiring pipeline and optimize continuously</li>
                </ul>
            </div>
            
            <div class="support-box">
                <h3>🤝 Need Help? We're Here!</h3>
                <p>📧 Email: support@talentiq.ai</p>
                <p>💬 Live Chat: Available in dashboard</p>
                <p>📚 Documentation: Comprehensive guides available</p>
            </div>
            
            <div style="background: linear-gradient(135deg, #e0e7ff, #fce7f3); border: 2px solid #a78bfa; padding: 25px; margin: 30px 0; border-radius: 16px; text-align: center;">
                <p style="margin: 0; color: #5b21b6; font-size: 16px; font-weight: 600;">
                    🎁 <strong>Special Offer:</strong> You're currently on our <strong>FREE BETA</strong> plan with all features unlocked!
                </p>
            </div>
            
            <div class="footer">
                <p style="font-size: 16px; color: #475569; font-weight: 600; margin-bottom: 15px;">
                    Ready to transform your hiring process? Let's get started! 🚀
                </p>
                
                <div class="footer-links">
                    <a href="{self.frontend_url}/dashboard">Dashboard</a>
                    <a href="{self.frontend_url}/pricing">Pricing</a>
                    <a href="{self.frontend_url}/privacy">Privacy</a>
                    <a href="{self.frontend_url}/terms">Terms</a>
                </div>
                
                <p style="margin-top: 25px; color: #cbd5e1; font-size: 13px;">
                    © 2024 TalentIQ - AI-Powered Recruitment Platform<br>
                    You're receiving this email because you created an account on TalentIQ
                </p>
            </div>
        </div>
    </div>
</body>
</html>
"""
        
        text_content = f"""
Welcome to TalentIQ - Your AI-Powered Recruitment Journey Begins!

Hi {recruiter_name}{company_greeting},

We're thrilled to have you on board! You now have access to the most advanced AI recruitment platform.

What You Can Do:
- Smart CV Analysis: Upload CVs and let AI extract insights instantly
- AI Matching: Match candidates to jobs with 95%+ accuracy
- Live AI Interviews: Conduct interviews with real-time AI analysis
- AI Assistant: Chat with AI for insights and decisions
- Analytics Dashboard: Track metrics and optimize hiring
- Auto JD Generation: Create perfect job descriptions with AI

Quick Start:
1. Upload candidate CVs or create job descriptions
2. Let AI analyze and match candidates
3. Schedule AI-powered interviews
4. Review AI insights and make decisions
5. Track and optimize your pipeline

Get Started: {self.frontend_url}/dashboard

Need Help?
Email: support@talentiq.ai
Live Chat: Available in dashboard

You're currently on our FREE BETA plan with all features unlocked!

Ready to transform your hiring process? Let's get started!

Best regards,
The TalentIQ Team
"""
        
        return self.send_email(recruiter_email, subject, html_content, text_content)


# Singleton instance
_email_service = None

def get_email_service() -> EmailService:
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
