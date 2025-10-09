"""Permission checking utilities for role-based access control."""

from typing import Optional, Literal
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import logging

import models

logger = logging.getLogger(__name__)

# Role types
RoleType = Literal["custodian", "contributor", "viewer"]

# Role hierarchy for comparison
ROLE_HIERARCHY = {
    "custodian": 3,
    "contributor": 2,
    "viewer": 1
}


def get_membership(
    user_id: UUID,
    tree_id: UUID,
    db_session: Session
) -> Optional[models.Membership]:
    """Get a user's membership in a tree.
    
    Args:
        user_id: User ID to check
        tree_id: Tree ID to check
        db_session: Database session
        
    Returns:
        Membership object if found, None otherwise
    """
    membership = db_session.query(models.Membership).filter(
        models.Membership.user_id == user_id,
        models.Membership.tree_id == tree_id
    ).first()
    
    return membership


def has_role(
    user_id: UUID,
    tree_id: UUID,
    required_role: RoleType,
    db_session: Session
) -> bool:
    """Check if a user has at least the required role in a tree.
    
    Uses role hierarchy: custodian > contributor > viewer
    
    Args:
        user_id: User ID to check
        tree_id: Tree ID to check
        required_role: Minimum role required ('custodian', 'contributor', 'viewer')
        db_session: Database session
        
    Returns:
        True if user has sufficient role, False otherwise
        
    Example:
        >>> has_role(user_id, tree_id, "contributor", db)
        True  # User is a custodian (which is >= contributor)
    """
    membership = get_membership(user_id, tree_id, db_session)
    
    if not membership:
        return False
    
    user_role_level = ROLE_HIERARCHY.get(membership.role, 0)
    required_role_level = ROLE_HIERARCHY.get(required_role, 999)
    
    return user_role_level >= required_role_level


def is_custodian(
    user_id: UUID,
    tree_id: UUID,
    db_session: Session
) -> bool:
    """Check if a user is a custodian of a tree.
    
    Args:
        user_id: User ID to check
        tree_id: Tree ID to check
        db_session: Database session
        
    Returns:
        True if user is a custodian, False otherwise
        
    Example:
        >>> is_custodian(user_id, tree_id, db)
        True  # User has custodian role
    """
    membership = get_membership(user_id, tree_id, db_session)
    
    if not membership:
        return False
    
    return membership.role == "custodian"


def is_contributor(
    user_id: UUID,
    tree_id: UUID,
    db_session: Session
) -> bool:
    """Check if a user is at least a contributor of a tree.
    
    Args:
        user_id: User ID to check
        tree_id: Tree ID to check
        db_session: Database session
        
    Returns:
        True if user is a contributor or custodian, False otherwise
    """
    return has_role(user_id, tree_id, "contributor", db_session)


def is_viewer(
    user_id: UUID,
    tree_id: UUID,
    db_session: Session
) -> bool:
    """Check if a user has at least viewer access to a tree.
    
    Args:
        user_id: User ID to check
        tree_id: Tree ID to check
        db_session: Database session
        
    Returns:
        True if user has any role in the tree, False otherwise
    """
    return has_role(user_id, tree_id, "viewer", db_session)


def require_membership(
    user_id: UUID,
    tree_id: UUID,
    db_session: Session,
    required_role: Optional[RoleType] = None
) -> models.Membership:
    """Require a user to have membership in a tree with optional role requirement.
    
    Args:
        user_id: User ID to check
        tree_id: Tree ID to check
        db_session: Database session
        required_role: Optional minimum role required
        
    Returns:
        Membership object if access granted
        
    Raises:
        HTTPException 403: User not a member or insufficient role
        HTTPException 404: Tree not found
        
    Example:
        >>> membership = require_membership(user.id, tree_id, db, "custodian")
        # Returns membership or raises 403
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
    
    # Get user membership
    membership = get_membership(user_id, tree_id, db_session)
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this tree"
        )
    
    # Check role if required
    if required_role:
        if not has_role(user_id, tree_id, required_role, db_session):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {required_role} role or higher"
            )
    
    return membership


def count_custodians(tree_id: UUID, db_session: Session) -> int:
    """Count the number of custodians in a tree.
    
    Args:
        tree_id: Tree ID to check
        db_session: Database session
        
    Returns:
        Number of custodians in the tree
    """
    count = db_session.query(models.Membership).filter(
        models.Membership.tree_id == tree_id,
        models.Membership.role == "custodian"
    ).count()
    
    return count


def validate_role_change(
    membership: models.Membership,
    new_role: RoleType,
    db_session: Session
) -> None:
    """Validate that a role change is allowed.
    
    Rules:
    - Cannot remove the last custodian from a tree
    - Role must be valid ('custodian', 'contributor', 'viewer')
    
    Args:
        membership: Membership to update
        new_role: New role to assign
        db_session: Database session
        
    Raises:
        HTTPException 400: Invalid role or would remove last custodian
        
    Example:
        >>> validate_role_change(membership, "contributor", db)
        # Raises 400 if this is the last custodian
    """
    # Validate role value
    if new_role not in ROLE_HIERARCHY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(ROLE_HIERARCHY.keys())}"
        )
    
    # If downgrading from custodian, check if they're the last one
    if membership.role == "custodian" and new_role != "custodian":
        custodian_count = count_custodians(membership.tree_id, db_session)
        
        if custodian_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last custodian from the tree. "
                       "Promote another member to custodian first."
            )
    
    logger.info(
        f"Role change validated: membership {membership.id} "
        f"from {membership.role} to {new_role}"
    )


def get_tree_memberships(
    tree_id: UUID,
    db_session: Session
) -> list[models.Membership]:
    """Get all memberships for a tree.
    
    Args:
        tree_id: Tree ID to get memberships for
        db_session: Database session
        
    Returns:
        List of membership objects
    """
    memberships = db_session.query(models.Membership).filter(
        models.Membership.tree_id == tree_id
    ).all()
    
    return memberships


def get_user_role(
    user_id: UUID,
    tree_id: UUID,
    db_session: Session
) -> Optional[str]:
    """Get a user's role in a tree.
    
    Args:
        user_id: User ID to check
        tree_id: Tree ID to check
        db_session: Database session
        
    Returns:
        Role string ('custodian', 'contributor', 'viewer') or None if not a member
    """
    membership = get_membership(user_id, tree_id, db_session)
    
    if not membership:
        return None
    
    return membership.role
