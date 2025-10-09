"""HTML email templates with Phylo brand styling.

These templates are designed to be elegant, responsive, and work well
across different email clients. They use inline CSS for maximum compatibility
and consistent branding with the Phylo frontend.
"""

import os
from typing import Dict, Optional
from .email_styles import PhyloEmailStyles, get_phylo_logo_html, get_environment_url


def render_otp_email(code: str, **kwargs) -> str:
    """Render OTP verification email with Phylo branding.
    
    Args:
        code: 6-digit OTP code
        **kwargs: Additional template variables
        
    Returns:
        HTML email content
    """
    styles = PhyloEmailStyles()
    logo_html = get_phylo_logo_html('medium')
    
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Verification Code - Phylo</title>
</head>
<body style="{styles.get_base_styles()}">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="{styles.get_container_styles()}">
                    <!-- Header -->
                    <tr>
                        <td style="{styles.get_header_styles('info')}">
                            <div style="color: #ffffff;">
                                {logo_html}
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="{styles.get_content_styles()}">
                            <h2 style="margin: 0 0 16px; color: {styles.COLORS['foreground']}; font-size: 24px; font-weight: 600;">
                                Your Verification Code
                            </h2>
                            
                            <p style="margin: 0 0 24px; color: {styles.COLORS['muted_foreground']}; font-size: 16px; line-height: 24px;">
                                Use the code below to complete your sign-in. This code will expire in <strong>10 minutes</strong>.
                            </p>
                            
                            <!-- OTP Code Box -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 24px;">
                                <tr>
                                    <td align="center" style="{styles.get_code_box_styles()}">
                                        <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: {styles.COLORS['male']}; font-family: {styles.FONTS['monospace']};">
                                            {code}
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0 0 16px; color: {styles.COLORS['muted_foreground']}; font-size: 14px; line-height: 20px;">
                                If you didn't request this code, you can safely ignore this email. Someone may have accidentally entered your email address.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="{styles.get_footer_styles()}">
                            <p style="margin: 0; color: {styles.COLORS['muted_foreground']}; font-size: 12px; line-height: 18px; text-align: center;">
                                This email was sent by Phylo.<br>
                                For questions or support, please contact us.
                            </p>
                        </td>
                    </tr>
                </table>
                
                <!-- Bottom spacing -->
                <table role="presentation" style="width: 100%; margin-top: 20px;">
                    <tr>
                        <td style="text-align: center; padding: 0 20px;">
                            <p style="margin: 0; color: {styles.COLORS['muted_foreground']}; font-size: 12px; line-height: 18px;">
                                © 2025 Phylo. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


def render_invite_email(
    tree_name: str,
    role: str,
    inviter_name: Optional[str],
    accept_url: str,
    tree_description: Optional[str] = None,
    is_resend: bool = False,
    **kwargs
) -> str:
    """Render tree invitation email with Phylo branding.
    
    Args:
        tree_name: Name of the family tree
        role: Role being offered ('custodian', 'contributor', 'viewer')
        inviter_name: Name of person sending invite (optional)
        accept_url: URL to accept the invitation
        tree_description: Description of the tree (optional)
        is_resend: Whether this is a resend (optional)
        **kwargs: Additional template variables
        
    Returns:
        HTML email content
    """
    styles = PhyloEmailStyles()
    logo_html = get_phylo_logo_html('medium')
    
    role_display = role.capitalize()
    role_color = styles.get_role_color(role)
    inviter_text = f" by {inviter_name}" if inviter_name else ""
    
    # Add resend note if applicable
    resend_note = ""
    if is_resend:
        resend_note = f"""
        <tr>
            <td style="padding: 0 0 24px;">
                <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; border-radius: 4px;">
                    <p style="margin: 0; color: #92400E; font-size: 14px; font-weight: 600;">
                        📧 Resent Invitation
                    </p>
                    <p style="margin: 4px 0 0; color: #92400E; font-size: 13px;">
                        This invitation was resent because the original email may have been lost or expired.
                    </p>
                </div>
            </td>
        </tr>
        """
    
    # Add tree description if provided
    tree_desc_html = ""
    if tree_description:
        tree_desc_html = f"""
        <p style="margin: 0 0 16px; color: {styles.COLORS['muted_foreground']}; font-size: 14px; line-height: 20px;">
            {tree_description}
        </p>
        """
    
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Family Tree Invitation - Phylo</title>
</head>
<body style="{styles.get_base_styles()}">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="{styles.get_container_styles()}">
                    <!-- Header -->
                    <tr>
                        <td style="{styles.get_header_styles('success')}">
                            <div style="color: #ffffff;">
                                {logo_html}
                            </div>
                            <p style="margin: 8px 0 0; color: #d1fae5; font-size: 14px;">
                                You've Been Invited!
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="{styles.get_content_styles()}">
                            {resend_note}
                            
                            <h2 style="margin: 0 0 16px; color: {styles.COLORS['foreground']}; font-size: 24px; font-weight: 600;">
                                Join "{tree_name}"
                            </h2>
                            
                            <p style="margin: 0 0 16px; color: {styles.COLORS['muted_foreground']}; font-size: 16px; line-height: 24px;">
                                You've been invited{inviter_text} to collaborate on the <strong>{tree_name}</strong> Phylo.
                            </p>
                            
                            {tree_desc_html}
                            
                            <!-- Role Badge -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 24px;">
                                <tr>
                                    <td style="{styles.get_role_badge_styles(role)}">
                                        <p style="margin: 0; color: {styles.COLORS['muted_foreground']}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                                            Your Role
                                        </p>
                                        <p style="margin: 4px 0 0; color: {styles.COLORS['foreground']}; font-size: 18px; font-weight: 600;">
                                            {role_display}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0 0 24px; color: {styles.COLORS['muted_foreground']}; font-size: 14px; line-height: 20px;">
                                As a <strong>{role_display}</strong>, you'll be able to {'view and edit' if role in ['custodian', 'contributor'] else 'view'} the family tree {'and manage settings' if role == 'custodian' else ''}.
                            </p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 24px;">
                                <tr>
                                    <td align="center">
                                        <a href="{accept_url}" style="{styles.get_button_styles('success')}">
                                            Accept Invitation
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0; color: {styles.COLORS['muted_foreground']}; font-size: 13px; line-height: 20px;">
                                Or copy and paste this link into your browser:<br>
                                <span style="color: {styles.COLORS['male']}; word-break: break-all;">{accept_url}</span>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="{styles.get_footer_styles()}">
                            <p style="margin: 0 0 8px; color: {styles.COLORS['muted_foreground']}; font-size: 12px; line-height: 18px; text-align: center;">
                                This invitation will expire in 7 days.
                            </p>
                            <p style="margin: 0; color: {styles.COLORS['muted_foreground']}; font-size: 12px; line-height: 18px; text-align: center;">
                                If you didn't expect this invitation, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                </table>
                
                <!-- Bottom spacing -->
                <table role="presentation" style="width: 100%; margin-top: 20px;">
                    <tr>
                        <td style="text-align: center; padding: 0 20px;">
                            <p style="margin: 0; color: {styles.COLORS['muted_foreground']}; font-size: 12px; line-height: 18px;">
                                © 2025 Phylo. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


def render_template(template_name: str, template_data: Dict) -> str:
    """Main template renderer that routes to specific template functions.
    
    Args:
        template_name: Name of template ('otp', 'invite')
        template_data: Dictionary of template variables
        
    Returns:
        Rendered HTML email content
    """
    if template_name == 'otp' and 'code' in template_data:
        return render_otp_email(**template_data)
    elif template_name == 'invite':
        return render_invite_email(**template_data)
    else:
        # Fallback for unknown templates
        items = ''.join(f"<li><strong>{k}</strong>: {v}</li>" for k, v in template_data.items())
        return f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
    <h2>Notification</h2>
    <ul>{items}</ul>
</body>
</html>
"""
