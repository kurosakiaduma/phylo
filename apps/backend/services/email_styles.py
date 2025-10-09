"""Standardized email styling system for Phylo.

This module provides consistent color schemes, gradients, and styling
that match the frontend design system for use across all email templates.
"""

from typing import Dict, Any


class PhyloEmailStyles:
    """Centralized styling configuration for Phylo email templates."""
    
    # Color palette matching frontend CSS variables
    COLORS = {
        # Primary colors
        'primary': '#1a202c',  # --primary
        'primary_foreground': '#f7fafc',  # --primary-foreground
        
        # Family tree specific colors
        'male': '#3183B8',  # --family-tree-male
        'female': '#D03FC6',  # --family-tree-female
        'neutral': '#718096',  # --family-tree-neutral
        
        # Semantic colors
        'background': '#ffffff',
        'foreground': '#1a202c',
        'muted': '#f7fafc',
        'muted_foreground': '#718096',
        'border': '#e2e8f0',
        
        # Status colors
        'success': '#10b981',
        'warning': '#f59e0b',
        'error': '#ef4444',
        'info': '#3b82f6',
        
        # Role colors
        'custodian': '#dc2626',  # red-600
        'contributor': '#ea580c',  # orange-600
        'viewer': '#2563eb'  # blue-600
    }
    
    # Gradients matching frontend
    GRADIENTS = {
        'primary': 'linear-gradient(135deg, #1a202c 0%, #3183B8 100%)',
        'secondary': 'linear-gradient(135deg, #D03FC6 0%, #f7fafc 100%)',
        'success': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'info': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'phylo_brand': 'linear-gradient(135deg, #10b981 0%, #3183B8 100%)'
    }
    
    # Typography
    FONTS = {
        'primary': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        'monospace': "'Courier New', Courier, monospace"
    }
    
    # Spacing
    SPACING = {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        'xxl': '40px'
    }
    
    # Border radius
    RADIUS = {
        'sm': '4px',
        'md': '8px',
        'lg': '12px'
    }
    
    @classmethod
    def get_base_styles(cls) -> str:
        """Get base email container styles."""
        return f"""
            margin: 0; 
            padding: 0; 
            font-family: {cls.FONTS['primary']}; 
            background-color: #f3f4f6;
        """
    
    @classmethod
    def get_container_styles(cls) -> str:
        """Get main email container styles."""
        return f"""
            max-width: 600px; 
            width: 100%; 
            border-collapse: collapse; 
            background-color: {cls.COLORS['background']}; 
            border-radius: {cls.RADIUS['lg']}; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        """
    
    @classmethod
    def get_header_styles(cls, gradient_type: str = 'phylo_brand') -> str:
        """Get header section styles with gradient."""
        gradient = cls.GRADIENTS.get(gradient_type, cls.GRADIENTS['phylo_brand'])
        return f"""
            padding: {cls.SPACING['xxl']} {cls.SPACING['xxl']} {cls.SPACING['lg']}; 
            text-align: center; 
            background: {gradient}; 
            border-radius: {cls.RADIUS['lg']} {cls.RADIUS['lg']} 0 0;
        """
    
    @classmethod
    def get_content_styles(cls) -> str:
        """Get main content area styles."""
        return f"""
            padding: {cls.SPACING['xxl']};
        """
    
    @classmethod
    def get_footer_styles(cls) -> str:
        """Get footer section styles."""
        return f"""
            padding: {cls.SPACING['xl']} {cls.SPACING['xxl']}; 
            border-top: 1px solid {cls.COLORS['border']}; 
            background-color: {cls.COLORS['muted']}; 
            border-radius: 0 0 {cls.RADIUS['lg']} {cls.RADIUS['lg']};
        """
    
    @classmethod
    def get_button_styles(cls, variant: str = 'primary') -> str:
        """Get CTA button styles."""
        if variant == 'success':
            background = cls.GRADIENTS['success']
        elif variant == 'info':
            background = cls.GRADIENTS['info']
        else:
            background = cls.GRADIENTS['phylo_brand']
            
        return f"""
            display: inline-block; 
            padding: 14px 32px; 
            background: {background}; 
            color: {cls.COLORS['primary_foreground']}; 
            text-decoration: none; 
            font-size: 16px; 
            font-weight: 600; 
            border-radius: {cls.RADIUS['md']}; 
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        """
    
    @classmethod
    def get_role_color(cls, role: str) -> str:
        """Get color for specific role."""
        return cls.COLORS.get(role, cls.COLORS['neutral'])
    
    @classmethod
    def get_code_box_styles(cls) -> str:
        """Get styles for OTP code display box."""
        return f"""
            padding: {cls.SPACING['lg']}; 
            background-color: {cls.COLORS['muted']}; 
            border: 2px solid {cls.COLORS['border']}; 
            border-radius: {cls.RADIUS['md']};
        """
    
    @classmethod
    def get_role_badge_styles(cls, role: str) -> str:
        """Get styles for role badge."""
        role_color = cls.get_role_color(role)
        return f"""
            padding: {cls.SPACING['md']}; 
            background-color: {cls.COLORS['muted']}; 
            border-left: 4px solid {role_color}; 
            border-radius: {cls.RADIUS['sm']};
        """


def get_phylo_logo_html(size: str = 'medium') -> str:
    """Get Phylo logo HTML with consistent styling.
    
    Args:
        size: Logo size ('small', 'medium', 'large')
        
    Returns:
        HTML string for logo display
    """
    sizes = {
        'small': '24px',
        'medium': '32px', 
        'large': '48px'
    }
    
    logo_size = sizes.get(size, sizes['medium'])
    base_url = get_environment_url()
    
    return f"""
        <div style="display: inline-flex; align-items: center; gap: 8px;">
            <img src="{base_url}/favicon-96x96.png" 
                 alt="Phylo Logo" 
                 style="width: {logo_size}; height: {logo_size}; display: inline-block; vertical-align: middle;" />
            <span style="font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Phylo</span>
        </div>
    """


def get_environment_url(environment: str = None) -> str:
    """Get the appropriate frontend URL based on environment.
    
    Args:
        environment: Environment type (optional, will use env var if not provided)
        
    Returns:
        Frontend URL string
    """
    import os
    
    # Use environment variable if available
    frontend_url = os.environ.get('FRONTEND_URL')
    if frontend_url:
        return frontend_url
    
    # Fallback based on environment parameter
    if environment == 'production':
        return 'https://taduma.me/phylo'
    else:
        return 'http://localhost:3050'
