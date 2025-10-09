"""Email service for sending invitation emails using Mailtrap API.

Provides elegant HTML email templates for invitations with Phylo branding.
"""

import os
import logging
from datetime import datetime
from typing import Optional
import requests
from .templates import render_invite_email
from .email_styles import get_environment_url

logger = logging.getLogger(__name__)

MAILTRAP_API_KEY = os.getenv("MAILTRAP_API_KEY")
MAILTRAP_API_URL = "https://send.api.mailtrap.io/api/send"
FROM_EMAIL = os.getenv("FROM_EMAIL", "no-reply@taduma.me")
FROM_NAME = os.getenv("FROM_NAME", "Phylo")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
FRONTEND_URL = get_environment_url(ENVIRONMENT)


def _format_date(dt: datetime) -> str:
    """Format datetime for display in emails."""
    return dt.strftime("%B %d, %Y at %I:%M %p")


def _get_invite_html(
    tree_name: str,
    tree_description: Optional[str],
    role: str,
    token: str,
    expires_at: datetime,
    inviter_name: str,
    is_resend: bool = False
) -> str:
    """Generate HTML for invitation email.
    
    Elegant design with inline CSS for maximum email client compatibility.
    """
    accept_url = f"{FRONTEND_URL}/invites/{token}"
    expiry_str = _format_date(expires_at)
    
    role_description = {
        "custodian": "full administrative access, including managing members and permissions",
        "contributor": "ability to add and edit family members",
        "viewer": "read-only access to view the family tree"
    }.get(role, "member access")
    
    resend_note = ""
    if is_resend:
        resend_note = """
        <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; color: #92400E; font-size: 14px;">
                <strong>📧 Resent Invitation</strong><br>
                This invitation was resent because the original email may have been lost or expired.
            </p>
        </div>
        """
    
    tree_desc_html = ""
    if tree_description:
        tree_desc_html = f"""
        <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 8px 0 0;">
            {tree_description}
        </p>
        """
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation to Join a Phylo Family Tree</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F3F4F6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F3F4F6; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <!-- Main Container -->
                    <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%); padding: 40px 40px 60px; text-align: center;">
                                <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                                    <img src="{FRONTEND_URL}/favicon-96x96.png" alt="Phylo Logo" style="width: 32px; height: 32px; vertical-align: middle; margin-right: 8px;" /> Phylo Invitation
                                </h1>
                                <p style="margin: 12px 0 0; color: #E0E7FF; font-size: 16px;">
                                    You've been invited to join a family tree
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                {resend_note}
                                
                                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                                    Hello! 👋
                                </p>
                                
                                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                                    <strong>{inviter_name}</strong> has invited you to join the 
                                    <strong style="color: #667EEA;">"{tree_name}"</strong> family tree.
                                </p>
                                
                                {tree_desc_html}
                                
                                <!-- Tree Info Card -->
                                <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin: 24px 0;">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td style="padding: 8px 0;">
                                                <span style="color: #6B7280; font-size: 14px; display: block; margin-bottom: 4px;">Tree Name</span>
                                                <span style="color: #111827; font-size: 16px; font-weight: 600;">{tree_name}</span>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; border-top: 1px solid #E5E7EB;">
                                                <span style="color: #6B7280; font-size: 14px; display: block; margin-bottom: 4px;">Your Role</span>
                                                <span style="color: #111827; font-size: 16px; font-weight: 600; text-transform: capitalize;">{role}</span>
                                                <p style="color: #6B7280; font-size: 13px; margin: 4px 0 0; line-height: 1.4;">
                                                    As a {role}, you'll have {role_description}.
                                                </p>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 8px 0; border-top: 1px solid #E5E7EB;">
                                                <span style="color: #6B7280; font-size: 14px; display: block; margin-bottom: 4px;">Invitation Expires</span>
                                                <span style="color: #111827; font-size: 14px;">{expiry_str}</span>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                                
                                <!-- CTA Button -->
                                <div style="text-align: center; margin: 32px 0;">
                                    <a href="{accept_url}" style="display: inline-block; background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%); color: #FFFFFF; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25); transition: transform 0.2s;">
                                        Accept Invitation
                                    </a>
                                </div>
                                
                                <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0; text-align: center;">
                                    Or copy and paste this link into your browser:<br>
                                    <a href="{accept_url}" style="color: #667EEA; word-break: break-all; text-decoration: none;">{accept_url}</a>
                                </p>
                                
                                <!-- Help Note -->
                                <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 16px; margin: 32px 0 0; border-radius: 4px;">
                                    <p style="margin: 0; color: #1E40AF; font-size: 13px; line-height: 1.5;">
                                        <strong>📩 Lost this email?</strong><br>
                                        Contact {inviter_name} to resend the invitation.
                                    </p>
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #F9FAFB; padding: 32px 40px; border-top: 1px solid #E5E7EB;">
                                <p style="margin: 0 0 8px; color: #6B7280; font-size: 13px; text-align: center;">
                                    This invitation was sent by {inviter_name} via Phylo
                                </p>
                                <p style="margin: 0; color: #9CA3AF; font-size: 12px; text-align: center;">
                                    If you weren't expecting this invitation, you can safely ignore this email.
                                </p>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Footer Text -->
                    <p style="margin: 24px 0 0; color: #9CA3AF; font-size: 12px; text-align: center;">
                        © 2025 Phylo. All rights reserved.
                    </p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    return html


def _get_invite_text(
    tree_name: str,
    role: str,
    token: str,
    expires_at: datetime,
    inviter_name: str,
    is_resend: bool = False
) -> str:
    """Generate plain text for invitation email (fallback)."""
    accept_url = f"{FRONTEND_URL}/invites/{token}"
    expiry_str = _format_date(expires_at)
    
    resend_note = ""
    if is_resend:
        resend_note = "\n[RESENT INVITATION]\nThis invitation was resent because the original may have been lost or expired.\n\n"
    
    text = f"""
Phylo Invitation

{resend_note}Hello!

{inviter_name} has invited you to join the "{tree_name}" family tree.

Your Role: {role.capitalize()}
Invitation Expires: {expiry_str}

To accept this invitation, click the link below or copy and paste it into your browser:

{accept_url}

Lost this email? Contact {inviter_name} to resend the invitation.

If you weren't expecting this invitation, you can safely ignore this email.

---
© 2025 Phylo. All rights reserved.
    """.strip()
    
    return text


def send_invite_email(
    to_email: str,
    tree_name: str,
    tree_description: Optional[str],
    role: str,
    token: str,
    expires_at: datetime,
    inviter_name: str,
    is_resend: bool = False
) -> bool:
    """Send invitation email using Mailtrap API.
    
    Args:
        to_email: Recipient email address
        tree_name: Name of the family tree
        tree_description: Description of the tree (optional)
        role: Role being offered (custodian, contributor, viewer)
        token: Unique invitation token
        expires_at: When the invitation expires
        inviter_name: Name of person sending invite
        is_resend: Whether this is a resend
        
    Returns:
        True if sent successfully, False otherwise
    """
    if not MAILTRAP_API_KEY:
        logger.error("MAILTRAP_API_KEY not configured")
        return False
    
    try:
        # Generate accept URL
        accept_url = f"{FRONTEND_URL}/invites/{token}"
        
        # Generate email content using new template system
        html_content = render_invite_email(
            tree_name=tree_name,
            role=role,
            inviter_name=inviter_name,
            accept_url=accept_url,
            tree_description=tree_description,
            is_resend=is_resend
        )
        
        # Generate plain text fallback
        text_content = _get_invite_text(
            tree_name, role, token, expires_at, inviter_name, is_resend
        )
        
        # Use "Family Tree" in subject but "Phylo" in content
        subject = f"{'[Resent] ' if is_resend else ''}Family Tree Invitation - {tree_name}"
        
        # Prepare request
        headers = {
            "Authorization": f"Bearer {MAILTRAP_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "from": {
                "email": FROM_EMAIL,
                "name": FROM_NAME
            },
            "to": [{"email": to_email}],
            "subject": subject,
            "text": text_content,
            "html": html_content,
            "category": "invitation"
        }
        
        # Send request
        response = requests.post(
            MAILTRAP_API_URL,
            json=payload,
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            logger.info(f"Invitation email sent successfully to {to_email}")
            return True
        else:
            logger.error(
                f"Failed to send invitation email to {to_email}: "
                f"Status {response.status_code}, Response: {response.text}"
            )
            return False
            
    except Exception as e:
        logger.error(f"Error sending invitation email to {to_email}: {str(e)}")
        return False
