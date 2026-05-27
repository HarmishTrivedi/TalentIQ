"""
EmailJS Provider Implementation.
Delivers emails using the EmailJS REST API.
"""
import os
import httpx
import structlog
from typing import Dict, Any, Optional, List
from app.services.email_provider import EmailProvider

logger = structlog.get_logger()

class EmailJSProvider(EmailProvider):
    """EmailJS REST API implementation of EmailProvider."""

    def __init__(self):
        self.service_id = os.getenv("EMAILJS_SERVICE_ID")
        self.user_id = os.getenv("EMAILJS_USER_ID")
        self.access_token = os.getenv("EMAILJS_ACCESS_TOKEN")
        self.api_url = "https://api.emailjs.com/api/v1.0/email/send"
        
        # Template IDs
        self.welcome_template = os.getenv("EMAILJS_WELCOME_TEMPLATE_ID")
        self.invitation_template = os.getenv("EMAILJS_CANDIDATE_INVITATION_TEMPLATE_ID")

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        template_params: Optional[Dict[str, Any]] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
        template_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send email via EmailJS API."""
        
        # Use provided template_id or fallback to default
        final_template_id = template_id or self.welcome_template
        
        if not all([self.service_id, final_template_id, self.user_id, self.access_token]):
            return {
                "status": "failed",
                "error_message": f"EmailJS credentials or template ({final_template_id}) not configured.",
                "raw_response": {}
            }
        
        payload = {
            "service_id": self.service_id,
            "template_id": final_template_id,
            "user_id": self.user_id,
            "accessToken": self.access_token,
            "template_params": {
                "to_email": to_email,    # Primary
                "email": to_email,       # Alias 1
                "recipient": to_email,   # Alias 2
                "to_name": template_params.get("user_name") or template_params.get("candidate_name") or "User",
                "subject": subject,
                "html_content": html_content,
                "text_content": text_content or "",
                **(template_params or {})
            }
        }

        # Handle attachments if provided (EmailJS supports Base64)
        if attachments:
            # Note: EmailJS has size limits on attachments via API
            payload["template_params"]["attachments"] = attachments

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.api_url,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    logger.info("EmailJS: Email sent successfully", to=to_email, subject=subject)
                    return {
                        "status": "sent",
                        "provider_id": "emailjs",
                        "raw_response": {"message": response.text}
                    }
                else:
                    error_detail = response.text
                    logger.error("EmailJS: Delivery failed", status_code=response.status_code, error=error_detail)
                    return {
                        "status": "failed",
                        "error_message": f"EmailJS Error ({response.status_code}): {error_detail}",
                        "raw_response": {"status_code": response.status_code, "body": error_detail}
                    }
        except Exception as e:
            logger.error("EmailJS: Connection exception", error=str(e))
            return {
                "status": "failed",
                "error_message": f"Connection Exception: {str(e)}",
                "raw_response": {}
            }
