"""Member management endpoints for creating and managing family tree members."""

from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import List, Optional
from uuid import UUID
from datetime import datetime
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

# Configuration for member avatar uploads
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads/avatars"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
AVATAR_SIZE = (400, 400)  # Standard avatar size


def sync_avatar_across_entities(email: str, avatar_url: Optional[str], db_session: Session, exclude_member_id: Optional[UUID] = None, exclude_user_id: Optional[UUID] = None):
    """Sync avatar URL across user and all members with the same email.
    
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
    
    # Update all members with this email
    member_query = db_session.query(models.Member).filter(models.Member.email == email)
    if exclude_member_id:
        member_query = member_query.filter(models.Member.id != exclude_member_id)
    
    members = member_query.all()
    for member in members:
        member.avatar_url = avatar_url
        logger.info(f"Synced avatar for member {member.id} with email {email}")
    
    db_session.commit()

router = APIRouter(tags=["Members"])


def _check_member_access(
    member_id: UUID,
    user: models.User,
    db_session: Session,
    required_role: Optional[str] = None
) -> tuple[models.Member, models.Membership]:
    """Check if user has access to a member and optionally validate role.
    
    Args:
        member_id: Member ID to check
        user: Current user
        db_session: Database session
        required_role: Optional role requirement ('custodian', 'contributor', 'viewer')
        
    Returns:
        Tuple of (Member, Membership) if access granted
        
    Raises:
        HTTPException 404: Member not found
        HTTPException 403: Access denied or insufficient permissions
    """
    # Check if member exists
    member = db_session.query(models.Member).filter(
        models.Member.id == member_id
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
    
    # Check user membership in the tree
    membership = db_session.query(models.Membership).filter(
        models.Membership.user_id == user.id,
        models.Membership.tree_id == member.tree_id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this tree"
        )
    
    # Check role if required
    if required_role:
        role_hierarchy = {"custodian": 3, "contributor": 2, "viewer": 1}
        user_role_level = role_hierarchy.get(membership.role, 0)
        required_role_level = role_hierarchy.get(required_role, 999)
        
        if user_role_level < required_role_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {required_role} role or higher"
            )
    
    return member, membership


def _check_tree_access(
    tree_id: UUID,
    user: models.User,
    db_session: Session,
    required_role: Optional[str] = None
) -> models.Membership:
    """Check if user has access to a tree and optionally validate role.
    
    Args:
        tree_id: Tree ID to check
        user: Current user
        db_session: Database session
        required_role: Optional role requirement ('custodian', 'contributor', 'viewer')
        
    Returns:
        Membership object if access granted
        
    Raises:
        HTTPException 404: Tree not found
        HTTPException 403: Access denied or insufficient permissions
    """
    # Check if tree exists
    tree = db_session.query(models.Tree).filter(
        models.Tree.id == tree_id
    ).first()
    
    if not tree:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tree not found"
        )
    
    # Check user membership
    membership = db_session.query(models.Membership).filter(
        models.Membership.user_id == user.id,
        models.Membership.tree_id == tree_id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this tree"
        )
    
    # Check role if required
    if required_role:
        role_hierarchy = {"custodian": 3, "contributor": 2, "viewer": 1}
        user_role_level = role_hierarchy.get(membership.role, 0)
        required_role_level = role_hierarchy.get(required_role, 999)
        
        if user_role_level < required_role_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {required_role} role or higher"
            )
    
    return membership


def _validate_member_against_settings(
    member_data: schemas.MemberCreate,
    tree: models.Tree,
    db_session: Session
) -> None:
    """Validate member data against tree settings.
    
    Args:
        member_data: Member creation data
        tree: Tree to validate against
        db_session: Database session
        
    Raises:
        HTTPException 400: If validation fails
    """
    # Parse tree settings
    settings = schemas.TreeSettings(**tree.settings_json) if tree.settings_json else schemas.TreeSettings()
    
    # Validate gender if provided (optional validation)
    if member_data.gender:
        allowed_genders = ["male", "female", "other", "prefer not to say"]
        if member_data.gender.lower() not in allowed_genders:
            logger.warning(f"Non-standard gender value provided: {member_data.gender}")
            # We allow it but log it for monitoring
    
    # Validate DOB format if provided
    if member_data.dob:
        try:
            # Try to parse as ISO 8601 date
            datetime.fromisoformat(member_data.dob.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Date of birth must be in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"
            )


@router.get('/trees/{tree_id}/members', response_model=List[schemas.MemberRead])
async def list_tree_members(
    tree_id: UUID,
    cursor: Optional[str] = Query(None, description="Cursor for pagination (member ID)"),
    limit: int = Query(50, ge=1, le=200, description="Number of members per page"),
    status: Optional[str] = Query(None, description="Filter by status: 'alive' or 'deceased'"),
    search: Optional[str] = Query(None, description="Search by name (case-insensitive)"),
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """List members in a tree with cursor-based pagination and filtering.
    
    Supports:
    - Cursor-based pagination for efficient scrolling
    - Filtering by alive/deceased status
    - Case-insensitive name search
    
    Args:
        tree_id: Tree ID
        cursor: Optional cursor (member ID) for pagination
        limit: Number of results per page (1-200)
        status: Filter by 'alive' or 'deceased'
        search: Search term for member name
        current_user: Authenticated user
        db_session: Database session
        
    Returns:
        List of members matching the criteria
        
    Raises:
        HTTPException 404: Tree not found
        HTTPException 403: Access denied
    """
    # Check access to tree
    _check_tree_access(tree_id, current_user, db_session)
    
    # Build query
    query = db_session.query(models.Member).filter(
        models.Member.tree_id == tree_id
    )
    
    # Apply status filter
    if status:
        if status.lower() == 'alive':
            query = query.filter(models.Member.deceased == False)
        elif status.lower() == 'deceased':
            query = query.filter(models.Member.deceased == True)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid status filter. Use 'alive' or 'deceased'"
            )
    
    # Apply search filter
    if search:
        # Case-insensitive search using ILIKE (Postgres)
        search_pattern = f"%{search}%"
        query = query.filter(
            models.Member.name.ilike(search_pattern)
        )
    
    # Apply cursor-based pagination
    if cursor:
        # Find the cursor member to get its created_at timestamp
        cursor_member = db_session.query(models.Member).filter(
            models.Member.id == UUID(cursor)
        ).first()
        
        if cursor_member:
            # Get members created after the cursor
            query = query.filter(
                or_(
                    models.Member.created_at > cursor_member.created_at,
                    and_(
                        models.Member.created_at == cursor_member.created_at,
                        models.Member.id > cursor_member.id
                    )
                )
            )
    
    # Order by created_at and id for consistent pagination
    query = query.order_by(models.Member.created_at.asc(), models.Member.id.asc())
    
    # Apply limit
    members = query.limit(limit).all()
    
    logger.info(f"Retrieved {len(members)} members from tree {tree_id}")
    
    return members


@router.get('/members/{member_id}', response_model=schemas.MemberRead)
async def get_member(
    member_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """Get detailed information about a specific member.
    
    Args:
        member_id: Member ID
        current_user: Authenticated user
        db_session: Database session
        
    Returns:
        Member details
        
    Raises:
        HTTPException 404: Member not found
        HTTPException 403: Access denied
    """
    member, _ = _check_member_access(member_id, current_user, db_session)
    
    logger.info(f"Retrieved member {member_id} details")
    
    return member


@router.post('/trees/{tree_id}/members', response_model=schemas.MemberRead, status_code=status.HTTP_201_CREATED)
async def create_member(
    tree_id: UUID,
    member_data: schemas.MemberCreate,
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """Create a new member in a tree.
    
    Requires custodian role.
    Validates input against tree settings.
    
    Args:
        tree_id: Tree ID
        member_data: Member creation data
        current_user: Authenticated user (must be custodian)
        db_session: Database session
        
    Returns:
        Created member
        
    Raises:
        HTTPException 404: Tree not found
        HTTPException 403: Access denied or insufficient permissions
        HTTPException 400: Validation error
    """
    # Check custodian access
    membership = _check_tree_access(tree_id, current_user, db_session, required_role="custodian")
    
    # Get tree for validation
    tree = db_session.query(models.Tree).filter(
        models.Tree.id == tree_id
    ).first()
    
    # Validate member data against tree settings
    _validate_member_against_settings(member_data, tree, db_session)
    
    # Create member
    new_member = models.Member(
        tree_id=tree_id,
        name=member_data.name,
        email=member_data.email,
        avatar_url=member_data.avatar_url,
        dob=member_data.dob,
        gender=member_data.gender,
        deceased=member_data.deceased,
        notes=member_data.notes,
        updated_by=current_user.id
    )
    
    db_session.add(new_member)
    db_session.commit()
    db_session.refresh(new_member)
    
    logger.info(f"Created member {new_member.id} in tree {tree_id} by user {current_user.id}")
    
    return new_member


@router.patch('/members/{member_id}', response_model=schemas.MemberRead)
async def update_member(
    member_id: UUID,
    member_data: schemas.MemberUpdate,
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """Update an existing member.
    
    Requires custodian role.
    Tracks the user who made the update.
    
    Args:
        member_id: Member ID
        member_data: Member update data (partial)
        current_user: Authenticated user (must be custodian)
        db_session: Database session
        
    Returns:
        Updated member
        
    Raises:
        HTTPException 404: Member not found
        HTTPException 403: Access denied or insufficient permissions
        HTTPException 400: Validation error
    """
    # Check custodian access
    member, _ = _check_member_access(member_id, current_user, db_session, required_role="custodian")
    
    # Validate DOB format if provided
    logger.info(f'Member data: {member_data}')
    print(f'Member data: {member_data}')
    if member_data.dob:
        try:
            datetime.fromisoformat(member_data.dob.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Date of birth must be in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)"
            )
    
    # Update fields
    update_data = member_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(member, field, value)
    
    # Track who updated
    member.updated_by = current_user.id
    member.updated_at = datetime.utcnow()
    
    db_session.commit()
    db_session.refresh(member)
    
    logger.info(f"Updated member {member_id} by user {current_user.id}")
    
    return member


@router.delete('/members/{member_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_member(
    member_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """Delete a member from the tree.
    
    Requires custodian role.
    Handles orphaned relationships by deleting all relationships involving this member.
    
    Args:
        member_id: Member ID to delete
        current_user: Authenticated user (must be custodian)
        db_session: Database session
        
    Returns:
        204 No Content on success
        
    Raises:
        HTTPException 404: Member not found
        HTTPException 403: Access denied or insufficient permissions
    """
    # Check custodian access
    member, _ = _check_member_access(member_id, current_user, db_session, required_role="custodian")
    
    # Delete all relationships involving this member
    # This handles orphaned relationships automatically
    deleted_relationships = db_session.query(models.Relationship).filter(
        or_(
            models.Relationship.a_member_id == member_id,
            models.Relationship.b_member_id == member_id
        )
    ).delete(synchronize_session=False)
    
    logger.info(f"Deleted {deleted_relationships} relationships for member {member_id}")
    
    # Delete the member
    db_session.delete(member)
    db_session.commit()
    
    logger.info(f"Deleted member {member_id} by user {current_user.id}")
    
    return None


@router.post('/members/{member_id}/avatar', status_code=status.HTTP_200_OK)
async def upload_member_avatar(
    member_id: UUID,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """Upload and set member avatar image.
    
    Requires custodian role.
    Accepts image files (jpg, png, gif, webp) up to 5MB.
    Images are automatically resized to 400x400 pixels.
    
    Args:
        member_id: Member ID
        file: Image file to upload
        current_user: Authenticated user (must be custodian)
        db_session: Database session
        
    Returns:
        Success message with avatar URL
        
    Raises:
        HTTPException 404: Member not found
        HTTPException 403: Access denied or insufficient permissions
        HTTPException 400: Invalid file type or size
        HTTPException 500: Upload failed
    """
    # Check custodian access
    member, _ = _check_member_access(member_id, current_user, db_session, required_role="custodian")
    
    try:
        # Validate file size
        if file.size and file.size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # Validate file extension
        if file.filename:
            file_ext = Path(file.filename).suffix.lower()
            if file_ext not in ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No filename provided"
            )
        
        # Read and validate image
        contents = await file.read()
        
        try:
            # Open and validate image
            image = Image.open(io.BytesIO(contents))
            
            # Convert to RGB if necessary (handles RGBA, P mode, etc.)
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize to standard avatar size
            image = image.resize(AVATAR_SIZE, Image.Resampling.LANCZOS)
            
        except Exception as e:
            logger.error(f"Error processing image: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image file"
            )
        
        # Generate unique filename
        unique_id = str(uuid.uuid4())
        filename = f"{member_id}_{unique_id}.jpg"
        file_path = UPLOAD_DIR / filename
        
        # Delete old avatar if exists
        if member.avatar_url:
            old_filename = Path(member.avatar_url).name
            old_file_path = UPLOAD_DIR / old_filename
            if old_file_path.exists():
                old_file_path.unlink()
                logger.info(f"Deleted old avatar: {old_filename}")
        
        # Save processed image
        image.save(file_path, "JPEG", quality=85, optimize=True)
        
        # Update member avatar URL
        avatar_url = f"/uploads/avatars/{filename}"
        member.avatar_url = avatar_url
        member.updated_by = current_user.id
        member.updated_at = datetime.utcnow()
        
        # Sync avatar across all entities with the same email
        if member.email:
            sync_avatar_across_entities(member.email, avatar_url, db_session, exclude_member_id=member.id)
        
        db_session.commit()
        db_session.refresh(member)
        
        logger.info(f"Avatar uploaded for member {member_id}: {filename}")
        
        return {
            "status": "ok",
            "message": "Avatar uploaded successfully",
            "avatar_url": avatar_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading member avatar: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload avatar"
        )


@router.delete('/members/{member_id}/avatar', status_code=status.HTTP_200_OK)
async def delete_member_avatar(
    member_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """Delete member avatar image.
    
    Requires custodian role.
    Removes the avatar file from storage and clears the avatar_url field.
    
    Args:
        member_id: Member ID
        current_user: Authenticated user (must be custodian)
        db_session: Database session
        
    Returns:
        Success message
        
    Raises:
        HTTPException 404: Member not found or no avatar
        HTTPException 403: Access denied or insufficient permissions
        HTTPException 500: Delete failed
    """
    # Check custodian access
    member, _ = _check_member_access(member_id, current_user, db_session, required_role="custodian")
    
    if not member.avatar_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member has no avatar to delete"
        )
    
    try:
        # Delete file from storage
        filename = Path(member.avatar_url).name
        file_path = UPLOAD_DIR / filename
        
        if file_path.exists():
            file_path.unlink()
            logger.info(f"Deleted avatar file: {filename}")
        
        # Clear avatar URL from database
        member.avatar_url = None
        member.updated_by = current_user.id
        member.updated_at = datetime.utcnow()
        
        # Sync avatar deletion across all entities with the same email
        if member.email:
            sync_avatar_across_entities(member.email, None, db_session, exclude_member_id=member.id)
        
        db_session.commit()
        db_session.refresh(member)
        
        logger.info(f"Avatar deleted for member {member_id}")
        
        return {
            "status": "ok",
            "message": "Avatar deleted successfully"
        }
        
    except Exception as e:
        logger.error(f"Error deleting member avatar: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete avatar"
        )
