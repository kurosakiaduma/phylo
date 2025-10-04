"""Member management endpoints for creating and managing family tree members."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import List, Optional
from uuid import UUID
from datetime import datetime
import logging

import models
import schemas
from utils import db
from utils.dependencies import get_current_user

logger = logging.getLogger(__name__)

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
    
    # For now, basic validation - gender is optional and flexible
    # In the future, we might add more sophisticated validation
    # based on tree settings (e.g., required fields, custom validations)
    
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
    if member_data.dob is not None:
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
