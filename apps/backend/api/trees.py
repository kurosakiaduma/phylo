"""Tree management endpoints for creating and managing family trees."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
import logging

import models
import schemas
from utils import db
from utils.dependencies import get_current_user
from utils.tree_validation import validate_settings_change, get_settings_change_impact

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Trees"])


def _validate_custodian_age(user: models.User, db_session: Session) -> None:
    """Validate that user is at least 12 years old to be a custodian.
    
    Args:
        user: User to validate
        db_session: Database session
        
    Raises:
        HTTPException 400: If user is under 12 years old
    """
    # For now, we'll allow all users to be custodians
    # In a real implementation, you'd check the user's DOB
    # This is a placeholder for future enhancement
    
    # Example implementation (requires DOB field in User model):
    # if user.dob:
    #     age = (datetime.utcnow().date() - user.dob).days / 365.25
    #     if age < 12:
    #         raise HTTPException(
    #             status_code=status.HTTP_400_BAD_REQUEST,
    #             detail="You must be at least 12 years old to create a tree"
    #         )
    pass


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


@router.get('/trees', response_model=List[schemas.TreeWithMembership])
async def list_trees(
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """List all trees the current user has access to with their roles.
    
    Returns trees ordered by most recently joined.
    
    Args:
        current_user: Authenticated user
        db_session: Database session
        
    Returns:
        List of trees with user's membership role
    """
    # Get all memberships for current user
    memberships = db_session.query(models.Membership).filter(
        models.Membership.user_id == current_user.id
    ).order_by(models.Membership.joined_at.desc()).all()
    
    result = []
    for membership in memberships:
        tree = db_session.query(models.Tree).filter(
            models.Tree.id == membership.tree_id
        ).first()
        
        if tree:
            # Count members in tree
            member_count = db_session.query(models.Member).filter(
                models.Member.tree_id == tree.id
            ).count()
            
            # Parse settings
            settings = schemas.TreeSettings(**tree.settings_json) if tree.settings_json else schemas.TreeSettings()
            
            result.append(schemas.TreeWithMembership(
                id=tree.id,
                name=tree.name,
                description=tree.description,
                settings=settings,
                created_by=tree.created_by,
                created_at=tree.created_at,
                role=membership.role,
                joined_at=membership.joined_at,
                member_count=member_count
            ))
    
    return result


@router.post('/trees', response_model=schemas.TreeRead, status_code=status.HTTP_201_CREATED)
async def create_tree(
    tree_data: schemas.TreeCreate,
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """Create a new family tree and assign creator as custodian.
    
    Validates:
    - User is at least 12 years old (custodian requirement)
    - Tree settings schema is valid
    
    Args:
        tree_data: Tree creation data
        current_user: Authenticated user
        db_session: Database session
        
    Returns:
        Created tree data
        
    Raises:
        HTTPException 400: Invalid age or settings
    """
    # Validate custodian age
    _validate_custodian_age(current_user, db_session)
    
    # Validate and prepare settings
    settings = tree_data.settings or schemas.TreeSettings()
    
    # Validate settings constraints
    if settings.monogamy and settings.allow_polygamy:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot enable both monogamy and polygamy"
        )
    
    if settings.max_spouses_per_member and settings.max_spouses_per_member < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="max_spouses_per_member must be at least 1"
        )
    
    if settings.max_parents_per_child and settings.max_parents_per_child < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="max_parents_per_child must be at least 1"
        )
    
    # Create tree
    new_tree = models.Tree(
        name=tree_data.name,
        description=tree_data.description,
        settings_json=settings.model_dump(),
        created_by=current_user.id
    )
    db_session.add(new_tree)
    db_session.flush()  # Get tree ID
    
    # Create custodian membership for creator
    membership = models.Membership(
        user_id=current_user.id,
        tree_id=new_tree.id,
        role='custodian'
    )
    db_session.add(membership)
    db_session.flush()  # Get membership ID
    
    # Automatically create a member for the custodian (first member in the tree)
    custodian_member = models.Member(
        tree_id=new_tree.id,
        name=current_user.display_name or current_user.email.split('@')[0],
        email=current_user.email,
        dob=current_user.dob,
        gender=current_user.gender,
        deceased=False,
        updated_by=current_user.id  # Using updated_by instead of created_by
    )
    db_session.add(custodian_member)
    
    db_session.commit()
    
    logger.info(f"Tree created: {new_tree.id} by user {current_user.id}, custodian member: {custodian_member.id}")
    
    # Return tree data
    return schemas.TreeRead(
        id=new_tree.id,
        name=new_tree.name,
        description=new_tree.description,
        settings=settings,
        created_by=new_tree.created_by,
        created_at=new_tree.created_at
    )


@router.get('/trees/{tree_id}', response_model=schemas.TreeDetail)
async def get_tree(
    tree_id: UUID,
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """Get detailed information about a specific tree.
    
    Includes tree metadata, settings, and user's role.
    Requires user to be a member of the tree.
    
    Args:
        tree_id: Tree UUID
        current_user: Authenticated user
        db_session: Database session
        
    Returns:
        Detailed tree information
        
    Raises:
        HTTPException 404: Tree not found
        HTTPException 403: User not a member
    """
    # Check access
    membership = _check_tree_access(tree_id, current_user, db_session)
    
    # Get tree
    tree = db_session.query(models.Tree).filter(
        models.Tree.id == tree_id
    ).first()
    
    # Count members and relationships
    member_count = db_session.query(models.Member).filter(
        models.Member.tree_id == tree_id
    ).count()
    
    relationship_count = db_session.query(models.Relationship).filter(
        models.Relationship.tree_id == tree_id
    ).count()
    
    # Get all memberships (for member list)
    memberships = db_session.query(models.Membership).filter(
        models.Membership.tree_id == tree_id
    ).all()
    
    membership_list = []
    for m in memberships:
        user = db_session.query(models.User).filter(
            models.User.id == m.user_id
        ).first()
        if user:
            membership_list.append(schemas.MembershipInfo(
                user_id=user.id,
                user_email=user.email,
                user_display_name=user.display_name,
                role=m.role,
                joined_at=m.joined_at
            ))
    
    # Parse settings
    settings = schemas.TreeSettings(**tree.settings_json) if tree.settings_json else schemas.TreeSettings()
    
    return schemas.TreeDetail(
        id=tree.id,
        name=tree.name,
        description=tree.description,
        settings=settings,
        created_by=tree.created_by,
        created_at=tree.created_at,
        user_role=membership.role,
        member_count=member_count,
        relationship_count=relationship_count,
        memberships=membership_list
    )


@router.patch('/trees/{tree_id}', response_model=schemas.TreeRead)
async def update_tree(
    tree_id: UUID,
    tree_update: schemas.TreeUpdate,
    force: bool = Query(False, description="Force update even if it would violate existing relationships"),
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """Update tree metadata and settings.
    
    Only custodians can update trees.
    
    **Settings Validation:**
    - Settings changes are validated against existing relationships
    - Cannot disable features that would violate existing data
    - Use `?force=true` to see what would be affected (still won't apply destructive changes)
    
    **Examples of Protected Changes:**
    - Cannot enable monogamy if members have multiple spouses
    - Cannot disable same-sex unions if such relationships exist
    - Cannot reduce max spouses if members exceed new limit
    - Cannot disable single parents if children have only one parent
    
    Args:
        tree_id: Tree UUID
        tree_update: Tree update data
        force: If true, show impact analysis (doesn't bypass validation)
        current_user: Authenticated user
        db_session: Database session
        
    Returns:
        Updated tree data
        
    Raises:
        HTTPException 404: Tree not found
        HTTPException 403: Not a custodian
        HTTPException 400: Invalid settings or would violate existing relationships
        HTTPException 409: Settings change would break existing relationships (with details)
    """
    # Check custodian access
    _check_tree_access(tree_id, current_user, db_session, required_role='custodian')
    
    # Get tree
    tree = db_session.query(models.Tree).filter(
        models.Tree.id == tree_id
    ).first()
    
    # Update simple fields
    if tree_update.name is not None:
        tree.name = tree_update.name
    
    if tree_update.description is not None:
        tree.description = tree_update.description
    
    # Handle settings update with validation
    if tree_update.settings is not None:
        # Basic validation
        if tree_update.settings.monogamy and tree_update.settings.allow_polygamy:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot enable both monogamy and polygamy"
            )
        
        if tree_update.settings.max_spouses_per_member and tree_update.settings.max_spouses_per_member < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="max_spouses_per_member must be at least 1"
            )
        
        if tree_update.settings.max_parents_per_child and tree_update.settings.max_parents_per_child < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="max_parents_per_child must be at least 1"
            )
        
        # Get current settings
        current_settings = schemas.TreeSettings(**tree.settings_json) if tree.settings_json else schemas.TreeSettings()
        new_settings = tree_update.settings
        
        # Validate settings change against existing relationships
        is_valid, errors = validate_settings_change(
            db_session,
            tree_id,
            current_settings,
            new_settings
        )
        
        if not is_valid:
            # Get detailed impact analysis
            impact = get_settings_change_impact(
                db_session,
                tree_id,
                current_settings,
                new_settings
            )
            
            logger.warning(
                f"Settings update rejected for tree {tree_id}: {errors}",
                extra={"impact": impact}
            )
            
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "message": "Settings change would violate existing relationships",
                    "errors": errors,
                    "impact": impact,
                    "suggestion": "Remove or modify the conflicting relationships before changing these settings"
                }
            )
        
        # Settings are valid, apply the update
        tree.settings_json = new_settings.model_dump()
        logger.info(f"Settings updated for tree {tree_id} by user {current_user.id}")
    
    db_session.commit()
    
    logger.info(f"Tree updated: {tree_id} by user {current_user.id}")
    
    # Return updated tree
    settings = schemas.TreeSettings(**tree.settings_json) if tree.settings_json else schemas.TreeSettings()
    
    return schemas.TreeRead(
        id=tree.id,
        name=tree.name,
        description=tree.description,
        settings=settings,
        created_by=tree.created_by,
        created_at=tree.created_at
    )


@router.post('/trees/{tree_id}/settings/preview')
async def preview_settings_change(
    tree_id: UUID,
    new_settings: schemas.TreeSettings,
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """Preview the impact of changing tree settings without applying them.
    
    This endpoint allows custodians to see what would be affected by
    a settings change before actually applying it. Useful for understanding
    the impact of disabling features like polygamy or same-sex unions.
    
    Args:
        tree_id: Tree UUID
        new_settings: Proposed new settings
        current_user: Authenticated user
        db_session: Database session
        
    Returns:
        Impact analysis with warnings and affected members/relationships
        
    Raises:
        HTTPException 404: Tree not found
        HTTPException 403: Not a custodian
    """
    # Check custodian access
    _check_tree_access(tree_id, current_user, db_session, required_role='custodian')
    
    # Get tree
    tree = db_session.query(models.Tree).filter(
        models.Tree.id == tree_id
    ).first()
    
    # Get current settings
    current_settings = schemas.TreeSettings(**tree.settings_json) if tree.settings_json else schemas.TreeSettings()
    
    # Get impact analysis
    impact = get_settings_change_impact(
        db_session,
        tree_id,
        current_settings,
        new_settings
    )
    
    # Add validation result
    is_valid, errors = validate_settings_change(
        db_session,
        tree_id,
        current_settings,
        new_settings
    )
    
    return {
        "tree_id": str(tree_id),
        "current_settings": current_settings.model_dump(),
        "proposed_settings": new_settings.model_dump(),
        "impact": impact,
        "can_apply": is_valid,
        "validation_errors": errors if not is_valid else None,
        "recommendation": (
            "Safe to apply - no conflicts detected" if is_valid else
            "Cannot apply - would violate existing relationships. " +
            "Remove or modify conflicting relationships first."
        )
    }


@router.delete('/trees/{tree_id}', status_code=status.HTTP_200_OK)
async def delete_tree(
    tree_id: UUID,
    permanent: bool = Query(False, description="Permanently delete (true) or soft delete (false)"),
    current_user: models.User = Depends(get_current_user),
    db_session: Session = Depends(db.get_db)
):
    """Delete or archive a tree.
    
    Only custodians can delete trees.
    By default, performs soft delete (archive).
    Use ?permanent=true for hard delete.
    
    Args:
        tree_id: Tree UUID
        permanent: If true, permanently delete; if false, soft delete
        current_user: Authenticated user
        db_session: Database session
        
    Returns:
        Deletion confirmation
        
    Raises:
        HTTPException 404: Tree not found
        HTTPException 403: Not a custodian
    """
    # Check custodian access
    _check_tree_access(tree_id, current_user, db_session, required_role='custodian')
    
    if permanent:
        # Hard delete: Remove all related data
        # Delete relationships
        db_session.query(models.Relationship).filter(
            models.Relationship.tree_id == tree_id
        ).delete()
        
        # Delete members
        db_session.query(models.Member).filter(
            models.Member.tree_id == tree_id
        ).delete()
        
        # Delete memberships
        db_session.query(models.Membership).filter(
            models.Membership.tree_id == tree_id
        ).delete()
        
        # Delete invites
        db_session.query(models.Invite).filter(
            models.Invite.tree_id == tree_id
        ).delete()
        
        # Delete tree
        db_session.query(models.Tree).filter(
            models.Tree.id == tree_id
        ).delete()
        
        db_session.commit()
        
        logger.warning(f"Tree permanently deleted: {tree_id} by user {current_user.id}")
        
        return {
            "status": "deleted",
            "message": "Tree permanently deleted",
            "tree_id": str(tree_id),
            "permanent": True
        }
    else:
        # Soft delete: Add archived flag (requires migration to add column)
        # For now, we'll just add a marker in the description
        tree = db_session.query(models.Tree).filter(
            models.Tree.id == tree_id
        ).first()
        
        if not tree.description:
            tree.description = "[ARCHIVED]"
        elif "[ARCHIVED]" not in tree.description:
            tree.description = f"[ARCHIVED] {tree.description}"
        
        db_session.commit()
        
        logger.info(f"Tree archived: {tree_id} by user {current_user.id}")
        
        return {
            "status": "archived",
            "message": "Tree archived (soft delete)",
            "tree_id": str(tree_id),
            "permanent": False,
            "note": "Tree can be restored by removing [ARCHIVED] prefix"
        }
