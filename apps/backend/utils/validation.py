"""Validation utilities for data integrity checks."""

from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Optional
from uuid import UUID
import models


def validate_unique_member_email(
    db_session: Session,
    email: str,
    exclude_member_id: Optional[UUID] = None
) -> None:
    """Validate that a member email is unique across all members.
    
    Args:
        db_session: Database session
        email: Email to validate
        exclude_member_id: Optional member ID to exclude from check (for updates)
        
    Raises:
        HTTPException 400: If email already exists for another member
    """
    if not email or email.strip() == '':
        return  # Allow empty/null emails
    
    query = db_session.query(models.Member).filter(
        models.Member.email == email.strip(),
        models.Member.email.isnot(None),
        models.Member.email != ''
    )
    
    if exclude_member_id:
        query = query.filter(models.Member.id != exclude_member_id)
    
    existing_member = query.first()
    
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A member with email '{email}' already exists. Each member must have a unique email address."
        )


def validate_unique_user_email(
    db_session: Session,
    email: str,
    exclude_user_id: Optional[UUID] = None
) -> None:
    """Validate that a user email is unique across all users.
    
    Args:
        db_session: Database session
        email: Email to validate
        exclude_user_id: Optional user ID to exclude from check (for updates)
        
    Raises:
        HTTPException 400: If email already exists for another user
    """
    if not email or email.strip() == '':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required for users"
        )
    
    query = db_session.query(models.User).filter(
        models.User.email == email.strip()
    )
    
    if exclude_user_id:
        query = query.filter(models.User.id != exclude_user_id)
    
    existing_user = query.first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A user with email '{email}' already exists."
        )
