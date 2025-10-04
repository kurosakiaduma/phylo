"""Membership management endpoints for role updates and member management."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
import logging

import models
import schemas
from utils import db
from utils.dependencies import get_current_user
from utils.permissions import (
    require_membership,
    validate_role_change,
    is_custodian,
    get_membership
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Memberships"])


@router.patch(
    '/memberships/{user_id}/{tree_id}',
    response_model=schemas.MembershipRead,
    status_code=status.HTTP_200_OK
)
def update_membership_role(
    user_id: UUID,
    tree_id: UUID,
    payload: schemas.MembershipUpdate,
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """Update a user's role in a tree (custodian-only).
    
    This endpoint allows custodians to change the role of any member in the tree,
    including promoting contributors to custodians or demoting other custodians.
    
    **Rules:**
    - Only custodians can update roles
    - Cannot remove the last custodian (must promote someone else first)
    - Valid roles: 'custodian', 'contributor', 'viewer'
    
    **Authorization:** Custodian only
    
    Args:
        user_id: UUID of the user whose role to update
        tree_id: UUID of the tree
        payload: New role information
        current_user: Currently authenticated user
        db_session: Database session
        
    Returns:
        Updated membership information
        
    Raises:
        HTTPException 403: Current user is not a custodian
        HTTPException 404: Membership not found
        HTTPException 400: Invalid role or would remove last custodian
        
    Example:
        PATCH /api/memberships/123e4567-e89b-12d3-a456-426614174000/987f6543-e21c-34d5-b678-123456789abc
        {
            "role": "custodian"
        }
    """
    # Check that current user is a custodian of the tree
    require_membership(current_user.id, tree_id, db_session, "custodian")
    
    logger.info(
        f"Custodian {current_user.email} attempting to update role "
        f"for user {user_id} in tree {tree_id}"
    )
    
    # Get the membership to update
    membership = get_membership(user_id, tree_id, db_session)
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership not found. User is not a member of this tree."
        )
    
    # Prevent self-demotion if you're the last custodian
    if user_id == current_user.id:
        logger.warning(
            f"User {current_user.email} attempting to change their own role "
            f"from {membership.role} to {payload.role}"
        )
    
    # Validate the role change
    validate_role_change(membership, payload.role, db_session)
    
    # Update the role
    old_role = membership.role
    membership.role = payload.role
    db_session.commit()
    db_session.refresh(membership)
    
    logger.info(
        f"Successfully updated membership {membership.id}: "
        f"{old_role} -> {payload.role} by {current_user.email}"
    )
    
    return membership


@router.get(
    '/trees/{tree_id}/memberships',
    response_model=list[schemas.MembershipInfo],
    status_code=status.HTTP_200_OK
)
def list_tree_memberships(
    tree_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """List all memberships for a tree.
    
    Returns information about all users who have access to the tree,
    including their roles and when they joined.
    
    **Authorization:** Any member (viewer, contributor, or custodian)
    
    Args:
        tree_id: UUID of the tree
        current_user: Currently authenticated user
        db_session: Database session
        
    Returns:
        List of membership information with user details
        
    Raises:
        HTTPException 403: User is not a member of this tree
        HTTPException 404: Tree not found
        
    Example:
        GET /api/trees/987f6543-e21c-34d5-b678-123456789abc/memberships
    """
    # Check that user has access to the tree (any role)
    require_membership(current_user.id, tree_id, db_session)
    
    # Get all memberships with user information
    memberships = db_session.query(
        models.Membership, models.User
    ).join(
        models.User,
        models.Membership.user_id == models.User.id
    ).filter(
        models.Membership.tree_id == tree_id
    ).all()
    
    # Build response
    result = []
    for membership, user in memberships:
        result.append({
            "user_id": user.id,
            "user_email": user.email,
            "user_display_name": user.display_name,
            "role": membership.role,
            "joined_at": membership.joined_at
        })
    
    logger.info(
        f"User {current_user.email} listed {len(result)} memberships for tree {tree_id}"
    )
    
    return result


@router.delete(
    '/memberships/{user_id}/{tree_id}',
    status_code=status.HTTP_200_OK
)
def remove_membership(
    user_id: UUID,
    tree_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """Remove a user's membership from a tree (custodian-only).
    
    This endpoint allows custodians to remove members from the tree.
    
    **Rules:**
    - Only custodians can remove members
    - Cannot remove the last custodian
    - Users can remove themselves unless they're the last custodian
    
    **Authorization:** Custodian only
    
    Args:
        user_id: UUID of the user to remove
        tree_id: UUID of the tree
        current_user: Currently authenticated user
        db_session: Database session
        
    Returns:
        Success message
        
    Raises:
        HTTPException 403: Current user is not a custodian
        HTTPException 404: Membership not found
        HTTPException 400: Would remove last custodian
        
    Example:
        DELETE /api/memberships/123e4567-e89b-12d3-a456-426614174000/987f6543-e21c-34d5-b678-123456789abc
    """
    # Check that current user is a custodian
    require_membership(current_user.id, tree_id, db_session, "custodian")
    
    logger.info(
        f"Custodian {current_user.email} attempting to remove "
        f"user {user_id} from tree {tree_id}"
    )
    
    # Get the membership to remove
    membership = get_membership(user_id, tree_id, db_session)
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership not found. User is not a member of this tree."
        )
    
    # Check if removing a custodian would leave the tree without one
    if membership.role == "custodian":
        custodian_count = db_session.query(models.Membership).filter(
            models.Membership.tree_id == tree_id,
            models.Membership.role == "custodian"
        ).count()
        
        if custodian_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last custodian from the tree. "
                       "Promote another member to custodian first."
            )
    
    # Remove the membership
    db_session.delete(membership)
    db_session.commit()
    
    logger.info(
        f"Successfully removed membership for user {user_id} "
        f"from tree {tree_id} by {current_user.email}"
    )
    
    return {
        "status": "ok",
        "message": "Membership removed successfully"
    }
