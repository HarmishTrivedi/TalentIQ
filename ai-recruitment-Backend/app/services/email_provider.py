"""
Email Provider Abstraction Layer.
Defines the interface for all email delivery providers (EmailJS, Resend, SMTP, etc.).
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List


class EmailProvider(ABC):
    """Base interface for all email delivery providers."""

    @abstractmethod
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        template_params: Optional[Dict[str, Any]] = None,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Send an email using the provider.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: Rich HTML content
            text_content: Plain text fallback
            template_params: Optional dynamic parameters for provider-side templates
            attachments: List of attachments (name, content, type)
            
        Returns:
            Dict containing status (sent/failed), provider_id, and raw_response.
        """
        pass
