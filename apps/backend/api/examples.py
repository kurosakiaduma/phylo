"""Example routes demonstrating authentication and authorization usage.

This file shows how to protect routes and enforce permissions using
the authentication dependencies we've created.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

import models
import schemas
from utils import db
from utils.dependencies import (
    get_current_user,
    get_current_user_optional,
    require_role
)

router = APIRouter(tags=["Examples"])


# Example 1: Public endpoint (no authentication required)
@router.get('/examples/public')
def public_endpoint():
    """Public endpoint - anyone can access."""
    return {
        "message": "This is a public endpoint",
        "authentication": "not required"
    }


# Example 2: Optional authentication
@router.get('/examples/optional-auth')
async def optional_auth_endpoint(
    current_user: models.User = Depends(get_current_user_optional)
):
    """Endpoint with optional authentication.
    
    Returns different data based on whether user is logged in.
    """
    if current_user:
        return {
            "message": f"Welcome back, {current_user.display_name}!",
            "user_id": str(current_user.id),
            "authenticated": True
        }
    else:
        return {
            "message": "Welcome, guest!",
            "authenticated": False
        }


# Example 3: Protected endpoint (authentication required)
@router.get('/examples/protected')
async def protected_endpoint(
    current_user: models.User = Depends(get_current_user)
):
    """Protected endpoint - requires valid authentication.
    
    Returns 401 if not authenticated.
    """
    return {
        "message": f"Hello {current_user.display_name}!",
        "user": {
            "id": str(current_user.id),
            "email": current_user.email,
            "display_name": current_user.display_name
        }
    }


# Example 4: Update user profile
@router.patch('/examples/profile', response_model=schemas.UserRead)
async def update_profile(
    updates: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """Update current user's profile.
    
    Users can only update their own profile.
    """
    # Update user
    if updates.display_name is not None:
        current_user.display_name = updates.display_name
    
    db_session.add(current_user)
    db_session.commit()
    db_session.refresh(current_user)
    
    return current_user


# Example 5: Tree list with authentication
@router.get('/examples/my-trees')
async def get_my_trees(
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """Get list of trees the current user belongs to."""
    memberships = db_session.query(models.Membership).filter(
        models.Membership.user_id == current_user.id
    ).all()
    
    trees = []
    for membership in memberships:
        tree = db_session.query(models.Tree).filter(
            models.Tree.id == membership.tree_id
        ).first()
        
        if tree:
            trees.append({
                "id": str(tree.id),
                "name": tree.name,
                "role": membership.role,
                "joined_at": membership.joined_at.isoformat()
            })
    
    return {
        "user_id": str(current_user.id),
        "trees": trees,
        "count": len(trees)
    }


# Example 6: Role-based authorization (viewer or higher)
@router.get('/examples/trees/{tree_id}/view')
async def view_tree(
    tree_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """View tree details.
    
    Any member (viewer, contributor, custodian) can view.
    """
    # Check if user has any role in this tree
    membership = db_session.query(models.Membership).filter(
        models.Membership.user_id == current_user.id,
        models.Membership.tree_id == tree_id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this tree"
        )
    
    tree = db_session.query(models.Tree).filter(
        models.Tree.id == tree_id
    ).first()
    
    if not tree:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tree not found"
        )
    
    return {
        "tree": {
            "id": str(tree.id),
            "name": tree.name,
            "description": tree.description
        },
        "your_role": membership.role
    }


# Example 7: Contributor or higher required
@router.post('/examples/trees/{tree_id}/members')
async def add_member_example(
    tree_id: UUID,
    member_data: schemas.MemberCreate,
    db_session: Session = Depends(db.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Add a member to a tree.
    
    Requires contributor or custodian role.
    """
    # Check role manually (you could also use require_role dependency)
    membership = db_session.query(models.Membership).filter(
        models.Membership.user_id == current_user.id,
        models.Membership.tree_id == tree_id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this tree"
        )
    
    # Check role level
    allowed_roles = ['contributor', 'custodian']
    if membership.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requires contributor or custodian role"
        )
    
    # Create member (simplified)
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
    
    return {
        "message": "Member added successfully",
        "member_id": str(new_member.id)
    }


# Example 8: Custodian only (using require_role dependency)
@router.delete('/examples/trees/{tree_id}')
async def delete_tree_example(
    tree_id: UUID,
    db_session: Session = Depends(db.get_db),
    # This automatically checks if user is custodian
    current_user: models.User = Depends(lambda: require_role(tree_id, 'custodian'))
):
    """Delete a tree.
    
    Only custodians can delete trees.
    
    Note: The require_role dependency automatically:
    - Checks if user is authenticated
    - Checks if user has membership in tree
    - Checks if user has custodian role
    - Returns 403 if any check fails
    """
    tree = db_session.query(models.Tree).filter(
        models.Tree.id == tree_id
    ).first()
    
    if not tree:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tree not found"
        )
    
    # Soft delete (or hard delete if you prefer)
    db_session.delete(tree)
    db_session.commit()
    
    return {
        "message": "Tree deleted successfully",
        "tree_id": str(tree_id)
    }


# Example 9: Complex authorization logic
@router.patch('/examples/trees/{tree_id}/transfer-ownership')
async def transfer_ownership(
    tree_id: UUID,
    new_owner_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """Transfer tree ownership to another custodian.
    
    Only the original creator or current custodians can transfer.
    New owner must already be a custodian.
    """
    # Get tree
    tree = db_session.query(models.Tree).filter(
        models.Tree.id == tree_id
    ).first()
    
    if not tree:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tree not found"
        )
    
    # Check if current user is custodian
    current_membership = db_session.query(models.Membership).filter(
        models.Membership.user_id == current_user.id,
        models.Membership.tree_id == tree_id
    ).first()
    
    if not current_membership or current_membership.role != 'custodian':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only custodians can transfer ownership"
        )
    
    # Check if new owner is a custodian
    new_owner_membership = db_session.query(models.Membership).filter(
        models.Membership.user_id == new_owner_id,
        models.Membership.tree_id == tree_id
    ).first()
    
    if not new_owner_membership or new_owner_membership.role != 'custodian':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New owner must be an existing custodian"
        )
    
    # Transfer ownership
    tree.created_by = new_owner_id
    db_session.add(tree)
    db_session.commit()
    
    return {
        "message": "Ownership transferred successfully",
        "new_owner_id": str(new_owner_id)
    }


# Example 10: Batch operations with authorization
@router.get('/examples/trees/{tree_id}/members')
async def list_tree_members(
    tree_id: UUID,
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """List members in a tree.
    
    Any member can view the list.
    Demonstrates pagination with authentication.
    """
    # Verify access
    membership = db_session.query(models.Membership).filter(
        models.Membership.user_id == current_user.id,
        models.Membership.tree_id == tree_id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this tree"
        )
    
    # Get members with pagination
    members = db_session.query(models.Member).filter(
        models.Member.tree_id == tree_id
    ).offset(skip).limit(limit).all()
    
    return {
        "tree_id": str(tree_id),
        "your_role": membership.role,
        "members": [
            {
                "id": str(m.id),
                "name": m.name,
                "email": m.email,
                "deceased": m.deceased
            }
            for m in members
        ],
        "count": len(members)
    }


# Note: To use these examples, add to main.py:
# from api import examples
# app.include_router(examples.router, prefix="/api")
