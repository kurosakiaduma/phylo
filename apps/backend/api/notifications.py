"""
Notification Settings API
Handles user notification preferences and settings
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import uuid

from utils.db import get_db
from utils.dependencies import get_current_user
from models import User, NotificationSettings, GlobalNotificationPreferences, Tree, Membership


router = APIRouter(prefix="/notifications", tags=["notifications"])


# Pydantic models for request/response
class NotificationSettingsCreate(BaseModel):
    tree_id: str
    events_enabled: bool = True
    birthdays_enabled: bool = True
    death_anniversaries_enabled: bool = True
    gallery_updates_enabled: bool = True
    member_updates_enabled: bool = False


class NotificationSettingsUpdate(BaseModel):
    events_enabled: Optional[bool] = None
    birthdays_enabled: Optional[bool] = None
    death_anniversaries_enabled: Optional[bool] = None
    gallery_updates_enabled: Optional[bool] = None
    member_updates_enabled: Optional[bool] = None


class NotificationSettingsResponse(BaseModel):
    id: str
    tree_id: str
    tree_name: str
    events_enabled: bool
    birthdays_enabled: bool
    death_anniversaries_enabled: bool
    gallery_updates_enabled: bool
    member_updates_enabled: bool
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class GlobalNotificationPreferencesUpdate(BaseModel):
    email_notifications_enabled: Optional[bool] = None
    weekly_digest_enabled: Optional[bool] = None
    push_notifications_enabled: Optional[bool] = None
    digest_day_of_week: Optional[int] = None


class GlobalNotificationPreferencesResponse(BaseModel):
    id: str
    email_notifications_enabled: bool
    weekly_digest_enabled: bool
    push_notifications_enabled: bool
    digest_day_of_week: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


@router.get("/settings", response_model=List[NotificationSettingsResponse])
async def get_notification_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all notification settings for the current user"""
    
    # Get all trees the user has access to
    user_trees = db.query(Tree).join(Membership).filter(
        Membership.user_id == current_user.id
    ).all()
    
    response = []
    for tree in user_trees:
        # Get existing settings or create defaults
        settings = db.query(NotificationSettings).filter(
            NotificationSettings.user_id == current_user.id,
            NotificationSettings.tree_id == tree.id
        ).first()
        
        if not settings:
            # Create default settings for this tree
            settings = NotificationSettings(
                user_id=current_user.id,
                tree_id=tree.id,
                events_enabled=True,
                birthdays_enabled=True,
                death_anniversaries_enabled=True,
                gallery_updates_enabled=True,
                member_updates_enabled=False
            )
            db.add(settings)
            db.commit()
            db.refresh(settings)
        
        response.append(NotificationSettingsResponse(
            id=str(settings.id),
            tree_id=str(settings.tree_id),
            tree_name=tree.name,
            events_enabled=settings.events_enabled,
            birthdays_enabled=settings.birthdays_enabled,
            death_anniversaries_enabled=settings.death_anniversaries_enabled,
            gallery_updates_enabled=settings.gallery_updates_enabled,
            member_updates_enabled=settings.member_updates_enabled,
            created_at=settings.created_at.isoformat(),
            updated_at=settings.updated_at.isoformat()
        ))
    
    return response


@router.post("/settings", response_model=NotificationSettingsResponse)
async def create_notification_settings(
    settings_data: NotificationSettingsCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create notification settings for a specific tree"""
    
    # Verify user has access to the tree
    tree_id = uuid.UUID(settings_data.tree_id)
    membership = db.query(Membership).filter(
        Membership.user_id == current_user.id,
        Membership.tree_id == tree_id
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this tree"
        )
    
    # Check if settings already exist
    existing_settings = db.query(NotificationSettings).filter(
        NotificationSettings.user_id == current_user.id,
        NotificationSettings.tree_id == tree_id
    ).first()
    
    if existing_settings:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Notification settings already exist for this tree"
        )
    
    # Create new settings
    new_settings = NotificationSettings(
        user_id=current_user.id,
        tree_id=tree_id,
        events_enabled=settings_data.events_enabled,
        birthdays_enabled=settings_data.birthdays_enabled,
        death_anniversaries_enabled=settings_data.death_anniversaries_enabled,
        gallery_updates_enabled=settings_data.gallery_updates_enabled,
        member_updates_enabled=settings_data.member_updates_enabled
    )
    
    db.add(new_settings)
    db.commit()
    db.refresh(new_settings)
    
    # Get tree name for response
    tree = db.query(Tree).filter(Tree.id == tree_id).first()
    
    return NotificationSettingsResponse(
        id=str(new_settings.id),
        tree_id=str(new_settings.tree_id),
        tree_name=tree.name if tree else "Unknown Tree",
        events_enabled=new_settings.events_enabled,
        birthdays_enabled=new_settings.birthdays_enabled,
        death_anniversaries_enabled=new_settings.death_anniversaries_enabled,
        gallery_updates_enabled=new_settings.gallery_updates_enabled,
        member_updates_enabled=new_settings.member_updates_enabled,
        created_at=new_settings.created_at.isoformat(),
        updated_at=new_settings.updated_at.isoformat()
    )


@router.put("/settings/{tree_id}", response_model=NotificationSettingsResponse)
async def update_notification_settings(
    tree_id: str,
    settings_data: NotificationSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update notification settings for a specific tree"""
    
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
    
    # Get existing settings or create new ones
    settings = db.query(NotificationSettings).filter(
        NotificationSettings.user_id == current_user.id,
        NotificationSettings.tree_id == tree_uuid
    ).first()
    
    if not settings:
        # Create new settings with defaults
        settings = NotificationSettings(
            user_id=current_user.id,
            tree_id=tree_uuid,
            events_enabled=True,
            birthdays_enabled=True,
            death_anniversaries_enabled=True,
            gallery_updates_enabled=True,
            member_updates_enabled=False
        )
        db.add(settings)
    
    # Update fields that were provided
    update_data = settings_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settings, field, value)
    
    db.commit()
    db.refresh(settings)
    
    # Get tree name for response
    tree = db.query(Tree).filter(Tree.id == tree_uuid).first()
    
    return NotificationSettingsResponse(
        id=str(settings.id),
        tree_id=str(settings.tree_id),
        tree_name=tree.name if tree else "Unknown Tree",
        events_enabled=settings.events_enabled,
        birthdays_enabled=settings.birthdays_enabled,
        death_anniversaries_enabled=settings.death_anniversaries_enabled,
        gallery_updates_enabled=settings.gallery_updates_enabled,
        member_updates_enabled=settings.member_updates_enabled,
        created_at=settings.created_at.isoformat(),
        updated_at=settings.updated_at.isoformat()
    )


@router.get("/global-preferences", response_model=GlobalNotificationPreferencesResponse)
async def get_global_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get global notification preferences for the current user"""
    
    preferences = db.query(GlobalNotificationPreferences).filter(
        GlobalNotificationPreferences.user_id == current_user.id
    ).first()
    
    if not preferences:
        # Create default preferences
        preferences = GlobalNotificationPreferences(
            user_id=current_user.id,
            email_notifications_enabled=True,
            weekly_digest_enabled=True,
            push_notifications_enabled=True,
            digest_day_of_week=1  # Monday
        )
        db.add(preferences)
        db.commit()
        db.refresh(preferences)
    
    return GlobalNotificationPreferencesResponse(
        id=str(preferences.id),
        email_notifications_enabled=preferences.email_notifications_enabled,
        weekly_digest_enabled=preferences.weekly_digest_enabled,
        push_notifications_enabled=preferences.push_notifications_enabled,
        digest_day_of_week=preferences.digest_day_of_week,
        created_at=preferences.created_at.isoformat(),
        updated_at=preferences.updated_at.isoformat()
    )


@router.put("/global-preferences", response_model=GlobalNotificationPreferencesResponse)
async def update_global_notification_preferences(
    preferences_data: GlobalNotificationPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update global notification preferences for the current user"""
    
    preferences = db.query(GlobalNotificationPreferences).filter(
        GlobalNotificationPreferences.user_id == current_user.id
    ).first()
    
    if not preferences:
        # Create new preferences with defaults
        preferences = GlobalNotificationPreferences(
            user_id=current_user.id,
            email_notifications_enabled=True,
            weekly_digest_enabled=True,
            push_notifications_enabled=True,
            digest_day_of_week=1
        )
        db.add(preferences)
    
    # Update fields that were provided
    update_data = preferences_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "digest_day_of_week" and (value < 1 or value > 7):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="digest_day_of_week must be between 1 (Monday) and 7 (Sunday)"
            )
        setattr(preferences, field, value)
    
    db.commit()
    db.refresh(preferences)
    
    return GlobalNotificationPreferencesResponse(
        id=str(preferences.id),
        email_notifications_enabled=preferences.email_notifications_enabled,
        weekly_digest_enabled=preferences.weekly_digest_enabled,
        push_notifications_enabled=preferences.push_notifications_enabled,
        digest_day_of_week=preferences.digest_day_of_week,
        created_at=preferences.created_at.isoformat(),
        updated_at=preferences.updated_at.isoformat()
    )
