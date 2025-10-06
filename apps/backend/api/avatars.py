"""Avatar management endpoints for retrieving and managing avatar files."""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
import logging
import os
import uuid
from pathlib import Path
from PIL import Image
import io
from typing import Optional

import models
import schemas
from utils import db
from utils.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Avatars"])

# Configuration for file uploads
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
AVATARS_DIR = UPLOAD_DIR / "avatars"
AVATARS_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
AVATAR_SIZE = (400, 400)  # Standard avatar size


@router.get("/uploads/avatars/{filename}")
async def get_avatar(filename: str):
    """Retrieve an avatar image by filename.
    
    Args:
        filename: The avatar filename (e.g., "user_123_abc.jpg")
        
    Returns:
        FileResponse: The avatar image file
        
    Raises:
        HTTPException 404: Avatar file not found
        HTTPException 400: Invalid filename
    """
    try:
        # Validate filename (basic security check)
        if not filename or ".." in filename or "/" in filename or "\\" in filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid filename"
            )
        
        # Check file extension
        file_ext = Path(filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type"
            )
        
        filepath = AVATARS_DIR / filename
        
        if not filepath.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Avatar not found"
            )
        
        # Return the file with appropriate headers
        return FileResponse(
            path=filepath,
            media_type=f"image/{file_ext[1:]}",  # Remove the dot from extension
            headers={
                "Cache-Control": "public, max-age=3600",  # Cache for 1 hour
                "ETag": f'"{filename}"'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving avatar {filename}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve avatar"
        )


@router.post("/upload/avatars")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user)
):
    """Upload an avatar image (general purpose).
    
    This endpoint allows uploading avatar images that can be used for any purpose.
    The uploaded image will be processed and stored with a unique filename.
    
    Args:
        file: The image file to upload
        
    Returns:
        JSON with the avatar URL and filename
        
    Raises:
        HTTPException 400: Invalid file type or size
        HTTPException 500: Server error during upload
    """
    try:
        # Validate file extension
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No filename provided"
            )
            
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
        filename = f"avatar_{uuid.uuid4()}{file_ext}"
        filepath = AVATARS_DIR / filename
        
        # Save processed image
        image.save(filepath, optimize=True, quality=85)
        
        # Return the avatar URL pointing to static files
        avatar_url = f"/uploads/avatars/{filename}"
        
        logger.info(f"Avatar uploaded by user {current_user.id}: {filename}")
        
        return {
            "status": "ok",
            "message": "Avatar uploaded successfully",
            "avatar_url": avatar_url,
            "filename": filename
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading avatar: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload avatar"
        )


@router.delete("/uploads/avatars/{filename}")
async def delete_avatar(
    filename: str,
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """Delete an avatar image by filename.
    
    This endpoint allows deletion of avatar files. Only the user who uploaded
    the avatar or users with appropriate permissions can delete it.
    
    Args:
        filename: The avatar filename to delete
        
    Returns:
        JSON confirmation of deletion
        
    Raises:
        HTTPException 400: Invalid filename
        HTTPException 404: Avatar not found
        HTTPException 403: Permission denied
        HTTPException 500: Server error during deletion
    """
    try:
        # Validate filename (basic security check)
        if not filename or ".." in filename or "/" in filename or "\\" in filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid filename"
            )
        
        filepath = AVATARS_DIR / filename
        
        if not filepath.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Avatar not found"
            )
        
        # TODO: Add permission checking here
        # For now, any authenticated user can delete any avatar
        # In production, you might want to track avatar ownership
        
        # Delete the file
        filepath.unlink()
        
        logger.info(f"Avatar deleted by user {current_user.id}: {filename}")
        
        return {
            "status": "ok",
            "message": "Avatar deleted successfully",
            "filename": filename
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting avatar {filename}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete avatar"
        )


@router.get("/uploads/avatars/")
async def list_avatars(
    current_user: models.User = Depends(get_current_user)
):
    """List all available avatar files.
    
    This endpoint returns a list of all avatar files in the system.
    Useful for debugging or administrative purposes.
    
    Returns:
        JSON with list of avatar filenames and their URLs
    """
    try:
        avatar_files = []
        
        for filepath in AVATARS_DIR.glob("*"):
            if filepath.is_file() and filepath.suffix.lower() in ALLOWED_EXTENSIONS:
                avatar_files.append({
                    "filename": filepath.name,
                    "url": f"/uploads/avatars/{filepath.name}",
                    "size": filepath.stat().st_size
                })
        
        return {
            "status": "ok",
            "avatars": avatar_files,
            "total": len(avatar_files)
        }
        
    except Exception as e:
        logger.error(f"Error listing avatars: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list avatars"
        )


@router.get("/uploads/avatars/info/{filename}")
async def get_avatar_info(
    filename: str,
    current_user: models.User = Depends(get_current_user)
):
    """Get information about an avatar file.
    
    Args:
        filename: The avatar filename
        
    Returns:
        JSON with avatar file information
        
    Raises:
        HTTPException 400: Invalid filename
        HTTPException 404: Avatar not found
    """
    try:
        # Validate filename (basic security check)
        if not filename or ".." in filename or "/" in filename or "\\" in filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid filename"
            )
        
        filepath = AVATARS_DIR / filename
        
        if not filepath.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Avatar not found"
            )
        
        # Get file stats
        stat = filepath.stat()
        
        # Try to get image dimensions
        dimensions = None
        try:
            with Image.open(filepath) as img:
                dimensions = {
                    "width": img.width,
                    "height": img.height,
                    "mode": img.mode
                }
        except Exception:
            pass  # Not a valid image or can't read dimensions
        
        return {
            "status": "ok",
            "filename": filename,
            "url": f"/uploads/avatars/{filename}",
            "size": stat.st_size,
            "created": stat.st_ctime,
            "modified": stat.st_mtime,
            "dimensions": dimensions
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting avatar info for {filename}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get avatar information"
        )
