"""
Gallery API
Handles photo uploads and gallery management
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import uuid
import os
import shutil
from pathlib import Path
import mimetypes
from PIL import Image
import io

from utils.db import get_db
from utils.dependencies import get_current_user
from models import User, GalleryPhoto, Tree, Member, Membership


router = APIRouter(prefix="/gallery", tags=["gallery"])


# Configuration
UPLOAD_DIR = Path("uploads/gallery")
THUMBNAIL_DIR = Path("uploads/gallery/thumbnails")
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

# Ensure upload directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
THUMBNAIL_DIR.mkdir(parents=True, exist_ok=True)


# Pydantic models
class GalleryPhotoResponse(BaseModel):
    id: str
    tree_id: str
    member_id: Optional[str]
    member_name: Optional[str]
    uploaded_by: str
    uploader_name: str
    file_path: str
    file_url: str
    thumbnail_url: str
    original_filename: Optional[str]
    caption: Optional[str]
    approved: bool
    approved_by: Optional[str]
    approved_at: Optional[str]
    file_size: Optional[int]
    file_size_formatted: str
    mime_type: Optional[str]
    width: Optional[int]
    height: Optional[int]
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class GalleryPhotoUpdate(BaseModel):
    caption: Optional[str] = None
    member_id: Optional[str] = None


class GalleryStatsResponse(BaseModel):
    total_photos: int
    approved_photos: int
    pending_photos: int
    total_size: int
    total_size_formatted: str
    photos_by_member: dict
    recent_uploads: int  # Last 30 days


def generate_thumbnail(image_path: Path, thumbnail_path: Path, size: tuple = (300, 300)):
    """Generate a thumbnail for an image"""
    try:
        with Image.open(image_path) as img:
            # Convert to RGB if necessary (for PNG with transparency)
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Create thumbnail
            img.thumbnail(size, Image.Resampling.LANCZOS)
            img.save(thumbnail_path, 'JPEG', quality=85, optimize=True)
            return True
    except Exception as e:
        print(f"Error generating thumbnail: {e}")
        return False


def get_image_dimensions(image_path: Path) -> tuple:
    """Get image dimensions"""
    try:
        with Image.open(image_path) as img:
            return img.size
    except Exception:
        return (None, None)


def format_file_size(size_bytes: int) -> str:
    """Format file size in human readable format"""
    if not size_bytes:
        return "Unknown"
    
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} TB"


@router.get("/trees/{tree_id}", response_model=List[GalleryPhotoResponse])
async def get_tree_gallery(
    tree_id: str,
    approved_only: bool = True,
    member_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all photos for a specific tree"""
    
    tree_uuid = uuid.UUID(tree_id)
    
    # Verify user has access to the tree
    membership = db.query(Membership).filter(
        Membership.user_id == current_user.id,
        Membership.tree_id == tree_uuid
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this tree"
        )
    
    # Build query
    query = db.query(GalleryPhoto).filter(GalleryPhoto.tree_id == tree_uuid)
    
    # Filter by approval status (non-custodians only see approved photos)
    if approved_only or membership.role not in ['custodian']:
        query = query.filter(GalleryPhoto.approved == True)
    
    # Filter by member if specified
    if member_id:
        query = query.filter(GalleryPhoto.member_id == uuid.UUID(member_id))
    
    photos = query.order_by(GalleryPhoto.created_at.desc()).all()
    
    # Convert to response format
    response = []
    for photo in photos:
        # Get member and uploader names
        member_name = None
        if photo.member_id:
            member = db.query(Member).filter(Member.id == photo.member_id).first()
            member_name = member.name if member else None
        
        uploader = db.query(User).filter(User.id == photo.uploaded_by).first()
        uploader_name = uploader.display_name if uploader else "Unknown"
        
        response.append(GalleryPhotoResponse(
            id=str(photo.id),
            tree_id=str(photo.tree_id),
            member_id=str(photo.member_id) if photo.member_id else None,
            member_name=member_name,
            uploaded_by=str(photo.uploaded_by),
            uploader_name=uploader_name,
            file_path=photo.file_path,
            file_url=photo.file_url,
            thumbnail_url=photo.thumbnail_url,
            original_filename=photo.original_filename,
            caption=photo.caption,
            approved=photo.approved,
            approved_by=str(photo.approved_by) if photo.approved_by else None,
            approved_at=photo.approved_at.isoformat() if photo.approved_at else None,
            file_size=photo.file_size,
            file_size_formatted=photo.get_file_size_formatted(),
            mime_type=photo.mime_type,
            width=photo.width,
            height=photo.height,
            created_at=photo.created_at.isoformat(),
            updated_at=photo.updated_at.isoformat()
        ))
    
    return response


@router.post("/trees/{tree_id}/upload", response_model=GalleryPhotoResponse)
async def upload_photo(
    tree_id: str,
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    member_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a photo to a tree's gallery"""
    
    tree_uuid = uuid.UUID(tree_id)
    
    # Verify user has access to the tree
    membership = db.query(Membership).filter(
        Membership.user_id == current_user.id,
        Membership.tree_id == tree_uuid
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this tree"
        )
    
    # Check if user can upload (contributors and custodians only)
    if membership.role not in ['contributor', 'custodian']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to upload photos"
        )
    
    # Validate file
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided"
        )
    
    # Check file size
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Check MIME type
    mime_type, _ = mimetypes.guess_type(file.filename)
    if mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_MIME_TYPES)}"
        )
    
    # Validate member_id if provided
    member_uuid = None
    if member_id:
        member_uuid = uuid.UUID(member_id)
        member = db.query(Member).filter(
            Member.id == member_uuid,
            Member.tree_id == tree_uuid
        ).first()
        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Member not found in this tree"
            )
    
    # Generate unique filename
    file_extension = Path(file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    thumbnail_path = THUMBNAIL_DIR / f"{unique_filename.rsplit('.', 1)[0]}_thumb.jpg"
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
        
        # Get image dimensions
        width, height = get_image_dimensions(file_path)
        
        # Generate thumbnail
        generate_thumbnail(file_path, thumbnail_path)
        
        # Auto-approve for custodians, require approval for others
        approved = membership.role == 'custodian'
        approved_by = current_user.id if approved else None
        
        # Create database record
        photo = GalleryPhoto(
            tree_id=tree_uuid,
            member_id=member_uuid,
            uploaded_by=current_user.id,
            file_path=unique_filename,
            original_filename=file.filename,
            caption=caption,
            approved=approved,
            approved_by=approved_by,
            file_size=len(file_content),
            mime_type=mime_type,
            width=width,
            height=height
        )
        
        if approved:
            from datetime import datetime
            photo.approved_at = datetime.utcnow()
        
        db.add(photo)
        db.commit()
        db.refresh(photo)
        
        # Get member and uploader names for response
        member_name = None
        if photo.member_id:
            member = db.query(Member).filter(Member.id == photo.member_id).first()
            member_name = member.name if member else None
        
        return GalleryPhotoResponse(
            id=str(photo.id),
            tree_id=str(photo.tree_id),
            member_id=str(photo.member_id) if photo.member_id else None,
            member_name=member_name,
            uploaded_by=str(photo.uploaded_by),
            uploader_name=current_user.display_name or "Unknown",
            file_path=photo.file_path,
            file_url=photo.file_url,
            thumbnail_url=photo.thumbnail_url,
            original_filename=photo.original_filename,
            caption=photo.caption,
            approved=photo.approved,
            approved_by=str(photo.approved_by) if photo.approved_by else None,
            approved_at=photo.approved_at.isoformat() if photo.approved_at else None,
            file_size=photo.file_size,
            file_size_formatted=photo.get_file_size_formatted(),
            mime_type=photo.mime_type,
            width=photo.width,
            height=photo.height,
            created_at=photo.created_at.isoformat(),
            updated_at=photo.updated_at.isoformat()
        )
        
    except Exception as e:
        # Clean up files if database operation fails
        if file_path.exists():
            file_path.unlink()
        if thumbnail_path.exists():
            thumbnail_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save photo: {str(e)}"
        )


@router.get("/trees/{tree_id}/stats", response_model=GalleryStatsResponse)
async def get_gallery_stats(
    tree_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get gallery statistics for a tree"""
    
    tree_uuid = uuid.UUID(tree_id)
    
    # Verify user has access to the tree
    membership = db.query(Membership).filter(
        Membership.user_id == current_user.id,
        Membership.tree_id == tree_uuid
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this tree"
        )
    
    # Get all photos for the tree
    photos = db.query(GalleryPhoto).filter(GalleryPhoto.tree_id == tree_uuid).all()
    
    # Calculate statistics
    total_photos = len(photos)
    approved_photos = sum(1 for p in photos if p.approved)
    pending_photos = total_photos - approved_photos
    total_size = sum(p.file_size or 0 for p in photos)
    
    # Photos by member
    photos_by_member = {}
    for photo in photos:
        if photo.member_id:
            member = db.query(Member).filter(Member.id == photo.member_id).first()
            member_name = member.name if member else "Unknown Member"
            photos_by_member[member_name] = photos_by_member.get(member_name, 0) + 1
        else:
            photos_by_member["General Photos"] = photos_by_member.get("General Photos", 0) + 1
    
    # Recent uploads (last 30 days)
    from datetime import datetime, timedelta
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_uploads = sum(1 for p in photos if p.created_at >= thirty_days_ago)
    
    return GalleryStatsResponse(
        total_photos=total_photos,
        approved_photos=approved_photos,
        pending_photos=pending_photos,
        total_size=total_size,
        total_size_formatted=format_file_size(total_size),
        photos_by_member=photos_by_member,
        recent_uploads=recent_uploads
    )


@router.put("/photos/{photo_id}/approve")
async def approve_photo(
    photo_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve a photo (custodians only)"""
    
    photo_uuid = uuid.UUID(photo_id)
    photo = db.query(GalleryPhoto).filter(GalleryPhoto.id == photo_uuid).first()
    
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found"
        )
    
    # Verify user is a custodian of the tree
    membership = db.query(Membership).filter(
        Membership.user_id == current_user.id,
        Membership.tree_id == photo.tree_id
    ).first()
    
    if not membership or membership.role != 'custodian':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only custodians can approve photos"
        )
    
    # Approve the photo
    photo.approved = True
    photo.approved_by = current_user.id
    from datetime import datetime
    photo.approved_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Photo approved successfully"}


@router.delete("/photos/{photo_id}")
async def delete_photo(
    photo_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a photo"""
    
    photo_uuid = uuid.UUID(photo_id)
    photo = db.query(GalleryPhoto).filter(GalleryPhoto.id == photo_uuid).first()
    
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found"
        )
    
    # Verify user can delete (uploader or custodian)
    membership = db.query(Membership).filter(
        Membership.user_id == current_user.id,
        Membership.tree_id == photo.tree_id
    ).first()
    
    can_delete = (
        photo.uploaded_by == current_user.id or 
        (membership and membership.role == 'custodian')
    )
    
    if not can_delete:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this photo"
        )
    
    # Delete files
    file_path = UPLOAD_DIR / photo.file_path
    thumbnail_path = THUMBNAIL_DIR / f"{photo.file_path.rsplit('.', 1)[0]}_thumb.jpg"
    
    if file_path.exists():
        file_path.unlink()
    if thumbnail_path.exists():
        thumbnail_path.unlink()
    
    # Delete database record
    db.delete(photo)
    db.commit()
    
    return {"message": "Photo deleted successfully"}
