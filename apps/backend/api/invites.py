"""Invitation system endpoints for tree membership invitations.

Features:
- Send invites with unique tokens
- Resend invites for lost emails
- View invite details
- Accept invites
- Custodian-only authorization
- Automatic expiry handling
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta, timezone
import secrets
import logging
import pytz

import models
import schemas
from utils import db
from utils.dependencies import get_current_user
from services.email_service import send_invite_email

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Invitations"])

# Invite settings
INVITE_EXPIRY_DAYS = 7
MAX_RESENDS = 3


def _generate_invite_token() -> str:
    """Generate a secure random token for invites."""
    return secrets.token_urlsafe(32)


def _check_custodian_access(
    tree_id: UUID,
    user: models.User,
    db_session: Session
) -> models.Tree:
    """Check if user is custodian of the tree.
    
    Args:
        tree_id: Tree ID to check
        user: Current user
        db_session: Database session
        
    Returns:
        Tree object if access granted
        
    Raises:
        HTTPException 404: Tree not found
        HTTPException 403: Not a custodian
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
    
    # Check user membership and role
    membership = db_session.query(models.Membership).filter(
        and_(
            models.Membership.user_id == user.id,
            models.Membership.tree_id == tree_id
        )
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this tree"
        )
    
    if membership.role != "custodian":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only custodians can send out invitations"
        )
    
    return tree


@router.post(
    "/invites",
    response_model=schemas.InviteRead,
    status_code=status.HTTP_201_CREATED,
    summary="Send tree invitation",
    description="Send an invitation to join a tree. Custodian-only."
)
async def send_invite(
    invite_data: schemas.InviteCreate,
    background_tasks: BackgroundTasks,
    db_session: Session = Depends(db.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Send an invitation to join a tree.
    
    - Generates unique secure token
    - Stores invite with 7-day expiry
    - Sends invitation email with tree context
    - Custodian-only authorization
    
    Args:
        invite_data: Invitation details (tree_id, email, role)
        background_tasks: FastAPI background tasks
        db_session: Database session
        current_user: Current authenticated user
        
    Returns:
        InviteRead: Created invitation object
        
    Raises:
        HTTPException 404: Tree not found
        HTTPException 403: Not a custodian
        HTTPException 400: User already member, invalid email, etc.
        HTTPException 409: Active invite already exists
    """
    # Check custodian access
    tree = _check_custodian_access(invite_data.tree_id, current_user, db_session)
    
    # Validate role
    valid_roles = ["custodian", "contributor", "viewer"]
    if invite_data.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
        )
    
    # Check if user is already a member
    existing_user = db_session.query(models.User).filter(
        models.User.email == invite_data.email
    ).first()
    
    if existing_user:
        existing_membership = db_session.query(models.Membership).filter(
            and_(
                models.Membership.user_id == existing_user.id,
                models.Membership.tree_id == invite_data.tree_id
            )
        ).first()
        
        if existing_membership:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User {invite_data.email} is already a member of this tree"
            )
    
    # Check for existing active invite
    now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
    existing_invite = db_session.query(models.Invite).filter(
        and_(
            models.Invite.tree_id == invite_data.tree_id,
            models.Invite.email == invite_data.email,
            models.Invite.accepted_at.is_(None),
            models.Invite.expires_at > now_naive
        )
    ).first()
    
    if existing_invite:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An active invitation already exists for this email. Use resend endpoint to send again."
        )
    
    # Generate token and create invite
    token = _generate_invite_token()
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=INVITE_EXPIRY_DAYS)
    
    invite = models.Invite(
        tree_id=invite_data.tree_id,
        member_id=invite_data.member_id,
        email=invite_data.email,
        role=invite_data.role,
        token=token,
        expires_at=expires_at,
        resend_count=0,
        created_by=current_user.id
    )
    
    db_session.add(invite)
    db_session.commit()
    db_session.refresh(invite)
    
    # Send invitation email in background
    background_tasks.add_task(
        send_invite_email,
        to_email=invite_data.email,
        tree_name=tree.name,
        tree_description=tree.description,
        role=invite_data.role,
        token=token,
        expires_at=expires_at,
        inviter_name=current_user.display_name or current_user.email
    )
    
    logger.info(
        f"Invite sent: {invite_data.email} to tree {tree.name} "
        f"as {invite_data.role} by {current_user.email}"
    )
    
    return invite


@router.post(
    "/invites/{token}/resend",
    response_model=schemas.InviteRead,
    summary="Resend invitation",
    description="Resend invitation email for lost or expired invites. Creates new invite if expired."
)
async def resend_invite(
    token: str,
    background_tasks: BackgroundTasks,
    db_session: Session = Depends(db.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Resend an invitation email.
    
    For elegant UX - handles cases where users lose invite emails.
    - If invite is expired, creates a new invite with new token
    - If invite is still valid, resends email with same token
    - Tracks resend count to prevent abuse (max 3 resends)
    - Custodian-only authorization
    
    Args:
        token: Invite token
        background_tasks: FastAPI background tasks
        db_session: Database session
        current_user: Current authenticated user
        
    Returns:
        InviteRead: Updated or new invitation object
        
    Raises:
        HTTPException 404: Invite not found
        HTTPException 403: Not a custodian
        HTTPException 400: Invite already accepted, max resends reached
    """
    # Find invite
    invite = db_session.query(models.Invite).filter(
        models.Invite.token == token
    ).first()
    
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    # Check custodian access
    tree = _check_custodian_access(invite.tree_id, current_user, db_session)
    
    # Check if already accepted
    if invite.accepted_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invitation has already been accepted"
        )
    
    # Check resend count
    if invite.resend_count >= MAX_RESENDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum resend limit ({MAX_RESENDS}) reached for this invitation. Please delete and create a new invitation."
        )
    
    # If expired, create new invite
    now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
    if invite.expires_at < now_naive:
        # Mark old invite as expired in logs
        logger.info(f"Creating new invite to replace expired invite {invite.id}")
        
        # Create new invite
        new_token = _generate_invite_token()
        new_expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=INVITE_EXPIRY_DAYS)
        
        new_invite = models.Invite(
            tree_id=invite.tree_id,
            member_id=invite.member_id,
            email=invite.email,
            role=invite.role,
            token=new_token,
            expires_at=new_expires_at,
            resend_count=invite.resend_count + 1,
            created_by=invite.created_by
        )
        
        db_session.add(new_invite)
        db_session.commit()
        db_session.refresh(new_invite)
        
        invite = new_invite
        token = new_token
    else:
        # Just increment resend count for existing invite
        invite.resend_count += 1
        db_session.commit()
    
    # Resend email
    background_tasks.add_task(
        send_invite_email,
        to_email=invite.email,
        tree_name=tree.name,
        tree_description=tree.description,
        role=invite.role,
        token=token,
        expires_at=invite.expires_at,
        inviter_name=current_user.display_name or current_user.email,
        is_resend=True
    )
    
    logger.info(
        f"Invite resent: {invite.email} to tree {tree.name} "
        f"by {current_user.email}"
    )
    
    return invite


#TODO:THIS NEEDS TO BE WRAPPED IN AUTH AS IT EXPOSES CRUCIAL INVITE DETAILS.
#ONLY CUSTODIANS HAVE ACCESS TO THIS INFORMATION
@router.get(
    "/invites/{token}",
    response_model=schemas.InviteDetail,
    summary="View invitation details",
    description="View invitation details by token. Public endpoint for frontend proxy."
)
async def get_invite(
    token: str,
    db_session: Session = Depends(db.get_db)
):
    """View invitation details for frontend proxy.
    
    Public endpoint - allows frontend to display invite info while user waits.
    Used by the frontend loading/waiting UI to show invite context.
    
    Args:
        token: Invite token
        db_session: Database session
        
    Returns:
        InviteDetail: Invitation details with tree information
        
    Raises:
        HTTPException 404: Invite not found
        HTTPException 400: Invite expired or already accepted
    """
    # Find invite
    invite = db_session.query(models.Invite).filter(
        models.Invite.token == token
    ).first()
    
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    # Check if already accepted
    if invite.accepted_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invitation has already been accepted"
        )
    
    # Check if expired
    now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
    if invite.expires_at < now_naive:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invitation has expired. Please contact the tree custodian for a new invite."
        )
    
    # Get tree details
    tree = db_session.query(models.Tree).filter(
        models.Tree.id == invite.tree_id
    ).first()
    
    if not tree:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated tree not found"
        )
    
    # Get creator details for inviter name
    creator = db_session.query(models.User).filter(
        models.User.id == invite.created_by
    ).first()
    
    # Get member name if member_id exists (for better UX)
    member_name = None
    if invite.member_id:
        member = db_session.query(models.Member).filter(
            models.Member.id == invite.member_id
        ).first()
        if member:
            member_name = member.name
    
    # Build response with enhanced data for frontend
    return schemas.InviteDetail(
        id=invite.id,
        tree_id=invite.tree_id,
        tree_name=tree.name,
        tree_description=tree.description,
        email=invite.email,
        role=invite.role,
        token=invite.token,
        expires_at=invite.expires_at,
        created_at=invite.created_at,
        inviter_name=creator.display_name if creator else None,
        member_name=member_name  # For "Hi {name}, we are getting your account ready"
    )


@router.post(
    "/invites/{token}/accept",
    response_model=schemas.MembershipInfo,
    summary="Accept invitation",
    description="Accept an invitation and join the tree. Requires authentication."
)
async def accept_invite(
    token: str,
    db_session: Session = Depends(db.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Accept an invitation to join a tree.
    
    - Validates token and expiry
    - Creates membership record
    - Marks invite as accepted
    - Requires user to be authenticated
    
    Args:
        token: Invite token
        db_session: Database session
        current_user: Current authenticated user
        
    Returns:
        MembershipInfo: Created membership object
        
    Raises:
        HTTPException 404: Invite not found
        HTTPException 400: Expired, already accepted, email mismatch, already member
    """
    # Find invite
    invite = db_session.query(models.Invite).filter(
        models.Invite.token == token
    ).first()
    
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    # Check if already accepted
    if invite.accepted_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invitation has already been accepted"
        )
    
    # Check if expired
    now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
    if invite.expires_at < now_naive:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invitation has expired"
        )
    
    # Verify email matches (case-insensitive)
    if current_user.email.lower() != invite.email.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This invitation is for {invite.email}, but you are logged in as {current_user.email}"
        )
    
    # Check if already a member
    existing_membership = db_session.query(models.Membership).filter(
        and_(
            models.Membership.user_id == current_user.id,
            models.Membership.tree_id == invite.tree_id
        )
    ).first()
    
    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of this tree"
        )
    
    # Handle unified ID system: ensure member record uses user's ID
    existing_member = db_session.query(models.Member).filter(
        and_(
            models.Member.email == current_user.email,
            models.Member.tree_id == invite.tree_id
        )
    ).first()
    
    if existing_member and existing_member.id != current_user.id:
        # Case 1: User signed up via Get Started, now accepting invite
        # We need to merge the existing member into the user's identity
        old_member_id = existing_member.id
        
        # Check if there's already a member with the user's ID in this tree
        user_member = db_session.query(models.Member).filter(
            and_(
                models.Member.id == current_user.id,
                models.Member.tree_id == invite.tree_id
            )
        ).first()
        
        if user_member:
            # Merge existing_member into user_member, then delete existing_member
            # Update relationships that reference the old member ID
            db_session.query(models.Relationship).filter(
                models.Relationship.a_member_id == old_member_id
            ).update({models.Relationship.a_member_id: current_user.id})
            
            db_session.query(models.Relationship).filter(
                models.Relationship.b_member_id == old_member_id
            ).update({models.Relationship.b_member_id: current_user.id})
            
            # Update invites that reference the old member
            db_session.query(models.Invite).filter(
                models.Invite.member_id == old_member_id
            ).update({models.Invite.member_id: current_user.id})
            
            # Merge data from existing_member into user_member (keep most complete data)
            user_member.name = user_member.name or existing_member.name
            user_member.avatar_url = user_member.avatar_url or existing_member.avatar_url
            user_member.dob = user_member.dob or existing_member.dob
            user_member.gender = user_member.gender or existing_member.gender
            user_member.pronouns = user_member.pronouns or existing_member.pronouns
            user_member.bio = user_member.bio or existing_member.bio
            
            # Delete the duplicate member
            db_session.delete(existing_member)
            
            logger.info(f"Merged duplicate member {old_member_id} into user member {current_user.id} in tree {invite.tree_id}")
        else:
            # Create new member with user's ID and merge data from existing member
            new_member = models.Member(
                id=current_user.id,
                tree_id=invite.tree_id,
                name=existing_member.name or current_user.display_name or current_user.email.split('@')[0],
                email=current_user.email,
                avatar_url=existing_member.avatar_url or current_user.avatar_url,
                dob=existing_member.dob or current_user.dob,
                gender=existing_member.gender or current_user.gender,
                pronouns=existing_member.pronouns or current_user.pronouns,
                bio=existing_member.bio or current_user.bio,
                deceased=existing_member.deceased,
                birth_place=existing_member.birth_place,
                death_place=existing_member.death_place,
                occupation=existing_member.occupation,
                notes=existing_member.notes,
                updated_by=current_user.id
            )
            
            db_session.add(new_member)
            
            # Update relationships that reference the old member ID
            db_session.query(models.Relationship).filter(
                models.Relationship.a_member_id == old_member_id
            ).update({models.Relationship.a_member_id: current_user.id})
            
            db_session.query(models.Relationship).filter(
                models.Relationship.b_member_id == old_member_id
            ).update({models.Relationship.b_member_id: current_user.id})
            
            # Update invites that reference the old member
            db_session.query(models.Invite).filter(
                models.Invite.member_id == old_member_id
            ).update({models.Invite.member_id: current_user.id})
            
            # Delete the old member
            db_session.delete(existing_member)
            
            logger.info(f"Created new member with user ID {current_user.id} and merged data from {old_member_id} in tree {invite.tree_id}")
        
    elif not existing_member:
        # Case 2: No member record exists, create one with user's ID
        new_member = models.Member(
            id=current_user.id,
            tree_id=invite.tree_id,
            name=current_user.display_name or current_user.email.split('@')[0],
            email=current_user.email,
            avatar_url=current_user.avatar_url,
            dob=current_user.dob,
            gender=current_user.gender,
            pronouns=current_user.pronouns,
            bio=current_user.bio,
            updated_by=current_user.id
        )
        
        db_session.add(new_member)
        logger.info(f"Created new member record with user ID {current_user.id} in tree {invite.tree_id}")
    
    # Create membership
    membership = models.Membership(
        user_id=current_user.id,
        tree_id=invite.tree_id,
        role=invite.role
    )
    
    db_session.add(membership)
    
    # Mark invite as accepted
    invite.accepted_at = datetime.now(timezone.utc).replace(tzinfo=None)
    
    db_session.commit()
    db_session.refresh(membership)
    
    # Get tree details for response
    tree = db_session.query(models.Tree).filter(
        models.Tree.id == invite.tree_id
    ).first()
    
    logger.info(
        f"Invite accepted: {current_user.email} joined tree {tree.name} "
        f"as {invite.role}"
    )
    
    return schemas.MembershipInfo(
        user_id=current_user.id,
        user_email=current_user.email,
        user_display_name=current_user.display_name,
        role=membership.role,
        joined_at=membership.joined_at
    )


@router.get(
    "/trees/{tree_id}/invites",
    response_model=List[schemas.InviteRead],
    summary="List tree invitations",
    description="List all invitations for a tree. Custodian-only."
)
async def list_tree_invites(
    tree_id: UUID,
    include_expired: bool = False,
    include_accepted: bool = False,
    db_session: Session = Depends(db.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """List all invitations for a tree.
    
    Useful for custodians to manage invitations.
    
    Args:
        tree_id: Tree ID
        include_expired: Include expired invites
        include_accepted: Include accepted invites
        db_session: Database session
        current_user: Current authenticated user
        
    Returns:
        List[InviteRead]: List of invitations
        
    Raises:
        HTTPException 404: Tree not found
        HTTPException 403: Not a custodian
    """
    # Check custodian access
    _check_custodian_access(tree_id, current_user, db_session)
    
    # Build query
    query = db_session.query(models.Invite).filter(
        models.Invite.tree_id == tree_id
    )
    
    # Filter by status
    if not include_accepted:
        query = query.filter(models.Invite.accepted_at.is_(None))
    
    if not include_expired:
        now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
        query = query.filter(models.Invite.expires_at > now_naive)
    
    # Order by creation date (newest first)
    invites = query.order_by(models.Invite.created_at.desc()).all()
    
    return invites


@router.delete(
    "/invites/{token}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cancel invitation",
    description="Cancel/revoke an invitation. Custodian-only."
)
async def cancel_invite(
    token: str,
    db_session: Session = Depends(db.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Cancel/revoke an invitation.
    
    Useful for custodians to revoke invitations before they're accepted.
    
    Args:
        token: Invite token
        db_session: Database session
        current_user: Current authenticated user
        
    Raises:
        HTTPException 404: Invite not found
        HTTPException 403: Not a custodian
        HTTPException 400: Already accepted
    """
    # Find invite
    invite = db_session.query(models.Invite).filter(
        models.Invite.token == token
    ).first()
    
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    # Check custodian access
    _check_custodian_access(invite.tree_id, current_user, db_session)
    
    # Check if already accepted
    if invite.accepted_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel an accepted invitation"
        )
    
    # Delete invite
    db_session.delete(invite)
    db_session.commit()
    
    logger.info(
        f"Invite cancelled: {invite.email} to tree {invite.tree_id} "
        f"by {current_user.email}"
    )
    
    return None
