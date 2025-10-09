"""User profile management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_
import logging
import os
import uuid
from pathlib import Path
from PIL import Image
import io

import models
import schemas
from utils import db
from utils.dependencies import get_current_user
from typing import Optional
from uuid import UUID
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Users"], prefix="/users")


@router.post('/check-email')
async def check_email_exists(
    payload: schemas.EmailCheck,
    db_session: Session = Depends(db.get_db)
):
    """Check if a user account exists for the given email.
    
    Used by the frontend to determine whether to show login or register flow.
    
    Args:
        payload: Email to check
        db_session: Database session
        
    Returns:
        dict: {"exists": bool, "email": str}
    """
    user = db_session.query(models.User).filter(
        models.User.email == payload.email
    ).first()
    
    return {
        "exists": user is not None,
        "email": payload.email
    }


# Configuration for file uploads
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads/avatars"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
AVATAR_SIZE = (400, 400)  # Standard avatar size


def sync_avatar_across_entities(email: str, avatar_url: Optional[str], db_session: Session, exclude_member_id: Optional[UUID] = None, exclude_user_id: Optional[UUID] = None):
    """Sync avatar URL across user and all members with the same email or ID.
    
    Args:
        email: Email to sync avatars for
        avatar_url: New avatar URL (or None to clear)
        db_session: Database session
        exclude_member_id: Member ID to exclude from sync (to avoid self-update)
        exclude_user_id: User ID to exclude from sync (to avoid self-update)
    """
    if not email:
        return
    
    # Update user with this email
    user_query = db_session.query(models.User).filter(models.User.email == email)
    if exclude_user_id:
        user_query = user_query.filter(models.User.id != exclude_user_id)
    
    user = user_query.first()
    if user:
        user.avatar_url = avatar_url
        logger.info(f"Synced avatar for user {user.id} with email {email}")
        
        # Also sync to members with the same ID (unified identity)
        unified_members = db_session.query(models.Member).filter(
            and_(
                models.Member.id == user.id,
                models.Member.id != exclude_member_id if exclude_member_id else True
            )
        ).all()
        
        for member in unified_members:
            member.avatar_url = avatar_url
            logger.info(f"Synced avatar for unified member {member.id} in tree {member.tree_id}")
    
    # Update all members with this email (legacy cases)
    member_query = db_session.query(models.Member).filter(models.Member.email == email)
    if exclude_member_id:
        member_query = member_query.filter(models.Member.id != exclude_member_id)
    if user:
        # Exclude members that already got updated via unified ID
        member_query = member_query.filter(models.Member.id != user.id)
    
    members = member_query.all()
    for member in members:
        member.avatar_url = avatar_url
        logger.info(f"Synced avatar for member {member.id} with email {email}")
    
    db_session.commit()


@router.get('/me', response_model=schemas.UserRead)
async def get_current_user_profile(
    current_user: models.User = Depends(get_current_user)
):
    """Get current user's profile information."""
    return current_user


def sync_user_data_to_members(user: models.User, db_session: Session):
    """Sync user profile data to all members with the same ID or email.
    
    This ensures that when a user updates their profile, the changes
    are reflected in their member records across all trees.
    
    Priority:
    1. First sync to members with the same ID (unified identity)
    2. Then sync to members with the same email but different ID (legacy cases)
    """
    # Find all members with this user's ID (unified identity system)
    members_by_id = db_session.query(models.Member).filter(
        models.Member.id == user.id
    ).all()
    
    # Find all members with this email but different ID (legacy cases)
    members_by_email = db_session.query(models.Member).filter(
        and_(
            models.Member.email == user.email,
            models.Member.id != user.id
        )
    ).all() if user.email else []
    
    all_members = members_by_id + members_by_email
    
    for member in all_members:
        # Always sync these fields (even if None/empty to clear them)
        member.avatar_url = user.avatar_url
        member.dob = user.dob
        member.gender = user.gender
        member.pronouns = user.pronouns
        member.bio = user.bio
        
        # Update member name if user has display_name, otherwise keep existing name
        if user.display_name:
            member.name = user.display_name
        
        # Update member email to match user email
        if user.email:
            member.email = user.email
        
        # Update metadata
        member.updated_at = datetime.utcnow()
        
        sync_type = "ID match" if member.id == user.id else "email match"
        logger.info(f"Synced user data to member {member.id} in tree {member.tree_id} ({sync_type})")
    
    # Commit all changes
    db_session.commit()
    
    return len(all_members)  # Return count of synced members


@router.patch('/me', response_model=schemas.UserRead)
async def update_current_user_profile(
    updates: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """Update current user's profile.
    
    Users can update their profile information including demographics.
    Changes are automatically synced to member records with the same email.
    """
    # Update user fields
    if updates.display_name is not None:
        current_user.display_name = updates.display_name
    
    if updates.avatar_url is not None:
        current_user.avatar_url = updates.avatar_url
    
    if updates.dob is not None:
        current_user.dob = updates.dob
    
    if updates.gender is not None:
        current_user.gender = updates.gender
    
    if updates.pronouns is not None:
        current_user.pronouns = updates.pronouns
    
    if updates.bio is not None:
        current_user.bio = updates.bio
    
    if updates.phone is not None:
        current_user.phone = updates.phone
    
    if updates.location is not None:
        current_user.location = updates.location
    
    db_session.add(current_user)
    db_session.commit()
    db_session.refresh(current_user)
    
    # Sync user data to member records
    synced_count = sync_user_data_to_members(current_user, db_session)
    
    logger.info(f"Profile updated for user {current_user.id}, synced to {synced_count} member records")
    
    return current_user


@router.post('/me/avatar', status_code=status.HTTP_200_OK)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """Upload and set user avatar image.
    
    Accepts image files (jpg, png, gif, webp) up to 5MB.
    The image will be automatically resized to 400x400 pixels.
    
    Returns:
        JSON with the avatar URL
        
    Raises:
        HTTPException 400: Invalid file type or size
        HTTPException 500: Server error during upload
    """
    try:
        # Validate file extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Read file content
        content = await file.read()
        
        # Validate file size
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE / (1024*1024)}MB"
            )
        
        # Open and process image
        try:
            image = Image.open(io.BytesIO(content))
            
            # Convert to RGB if necessary (handles RGBA, P, etc.)
            if image.mode not in ('RGB', 'RGBA'):
                image = image.convert('RGB')
            
            # Resize to square, maintaining aspect ratio
            # Calculate crop box for center square
            width, height = image.size
            min_dimension = min(width, height)
            left = (width - min_dimension) // 2
            top = (height - min_dimension) // 2
            right = left + min_dimension
            bottom = top + min_dimension
            
            # Crop to square and resize
            image = image.crop((left, top, right, bottom))
            image = image.resize(AVATAR_SIZE, Image.Resampling.LANCZOS)
            
        except Exception as e:
            logger.error(f"Error processing image: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image file or corrupted image"
            )
        
        # Generate unique filename
        filename = f"{current_user.id}_{uuid.uuid4()}{file_ext}"
        filepath = UPLOAD_DIR / filename
        
        # Save processed image
        image.save(filepath, optimize=True, quality=85)
        
        # Delete old avatar if exists
        if current_user.avatar_url:
            old_filename = Path(current_user.avatar_url).name
            old_filepath = UPLOAD_DIR / old_filename
            if old_filepath.exists():
                try:
                    old_filepath.unlink()
                except Exception as e:
                    logger.warning(f"Failed to delete old avatar: {e}")
        
        # Update user avatar URL
        avatar_url = f"/uploads/avatars/{filename}"
        current_user.avatar_url = avatar_url
        
        # Sync avatar across all entities with the same email
        sync_avatar_across_entities(current_user.email, avatar_url, db_session, exclude_user_id=current_user.id)
        
        db_session.add(current_user)
        db_session.commit()
        db_session.refresh(current_user)
        
        logger.info(f"Avatar uploaded for user {current_user.id}: {filename}")
        
        return {
            "status": "ok",
            "message": "Avatar uploaded successfully",
            "avatar_url": avatar_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading avatar: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload avatar"
        )


@router.delete('/me/avatar', status_code=status.HTTP_200_OK)
async def delete_avatar(
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """Delete user's avatar image.
    
    Removes the avatar file from storage and clears the avatar_url.
    """
    if not current_user.avatar_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No avatar to delete"
        )
    
    try:
        # Delete file
        filename = Path(current_user.avatar_url).name
        filepath = UPLOAD_DIR / filename
        if filepath.exists():
            filepath.unlink()
        
        # Clear avatar URL
        current_user.avatar_url = None
        
        # Sync avatar deletion across all entities with the same email
        sync_avatar_across_entities(current_user.email, None, db_session, exclude_user_id=current_user.id)
        
        db_session.add(current_user)
        db_session.commit()
        
        logger.info(f"Avatar deleted for user {current_user.id}")
        
        return {
            "status": "ok",
            "message": "Avatar deleted successfully"
        }
        
    except Exception as e:
        logger.error(f"Error deleting avatar: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete avatar"
        )
