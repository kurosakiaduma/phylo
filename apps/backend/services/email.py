"""Email sending wrapper: Mailtrap API only.

Environment variables used:
- MAILTRAP_API_KEY, MAILTRAP_SENDER_EMAIL, MAILTRAP_INBOX_ID

This module provides elegant email templates and sending functionality
for OTP codes and invitations.
"""

from typing import Optional, Tuple, Dict
import os
import logging
from mailtrap import MailtrapClient
from mailtrap.models.mail import Mail, Address
from .templates import render_template

logger = logging.getLogger(__name__)

MAILTRAP_API_KEY = os.environ.get('MAILTRAP_API_KEY')
MAILTRAP_SENDER_EMAIL = os.environ.get('MAILTRAP_SENDER_EMAIL')
MAILTRAP_INBOX_ID = os.environ.get('MAILTRAP_INBOX_ID')


def _send_via_mailtrap(
    to: str,
    subject: Optional[str],
    html: Optional[str],
    template_name: Optional[str],
    template_data: Optional[Dict]
):
    """Send email via Mailtrap API.
    
    Args:
        to: Recipient email address
        subject: Email subject
        html: Pre-rendered HTML (takes precedence)
        template_name: Template name ('otp', 'invite')
        template_data: Data for template rendering
        
    Returns:
        Tuple of (success, details)
    """
    if not MAILTRAP_API_KEY or not MAILTRAP_SENDER_EMAIL or not MAILTRAP_INBOX_ID:
        return False, {'error': 'mailtrap-credentials-missing'}
    
    try:
        client = MailtrapClient(token=MAILTRAP_API_KEY)
        
        # Use provided HTML or render template
        if html:
            html_body = html
        elif template_name and template_data:
            html_body = render_template(template_name, template_data)
        else:
            # Fallback for missing template data
            html_body = "<p>No content provided</p>"
        
        message = Mail(
            sender=Address(email=MAILTRAP_SENDER_EMAIL, name="Family Tree"),
            to=[Address(email=to)],
            subject=subject or '(no subject)',
            html=html_body,
        )
        
        resp = client.send(message)
        logger.info(f"Email sent successfully to {to} via Mailtrap")
        return True, {'method': 'mailtrap', 'response': resp}
    except Exception as exc:
        logger.exception('Mailtrap send failed')
        return False, {'error': 'mailtrap-send-failed', 'exception': str(exc)}


def send_email(
    to: str,
    subject: Optional[str] = None,
    html: Optional[str] = None,
    template_name: Optional[str] = None,
    template_data: Optional[Dict] = None,
) -> Tuple[bool, Dict]:
    """Send an email using Mailtrap API.
    
    Args:
        to: Recipient email address
        subject: Email subject line
        html: Pre-rendered HTML content (optional)
        template_name: Template to use ('otp', 'invite') (optional)
        template_data: Data for template rendering (optional)
    
    Returns:
        Tuple of (success: bool, details: dict)
        
    Examples:
        # Send OTP email
        send_email(
            to="user@example.com",
            subject="Your Verification Code",
            template_name="otp",
            template_data={"code": "123456"}
        )
        
        # Send invite email
        send_email(
            to="user@example.com",
            subject="Join Our Family Tree",
            template_name="invite",
            template_data={
                "tree_name": "Smith Family",
                "role": "contributor",
                "inviter_name": "John Smith",
                "accept_url": "https://app.example.com/invites/abc123"
            }
        )
    """
    return _send_via_mailtrap(to, subject, html, template_name, template_data)
