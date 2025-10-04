"""User profile management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
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

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Users"], prefix="/api/users")

# Configuration for file uploads
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads/avatars"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
AVATAR_SIZE = (400, 400)  # Standard avatar size


@router.get('/me', response_model=schemas.UserRead)
async def get_current_user_profile(
    current_user: models.User = Depends(get_current_user)
):
    """Get current user's profile information."""
    return current_user


@router.patch('/me', response_model=schemas.UserRead)
async def update_current_user_profile(
    updates: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """Update current user's profile.
    
    Users can update their display name and avatar URL.
    """
    # Update user fields
    if updates.display_name is not None:
        current_user.display_name = updates.display_name
    
    if updates.avatar_url is not None:
        current_user.avatar_url = updates.avatar_url
    
    db_session.add(current_user)
    db_session.commit()
    db_session.refresh(current_user)
    
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
        # In production, this should be a full URL with domain
        avatar_url = f"/uploads/avatars/{filename}"
        current_user.avatar_url = avatar_url
        
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
