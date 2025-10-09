"""
Notification Settings Model
Manages user notification preferences per tree
"""

from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, TIMESTAMP, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from utils.db import Base


class NotificationSettings(Base):
    """User notification preferences for specific trees"""
    __tablename__ = 'notification_settings'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    tree_id = Column(UUID(as_uuid=True), ForeignKey('trees.id', ondelete='CASCADE'), nullable=False)
    
    # Event notification settings
    events_enabled = Column(Boolean, nullable=False, default=True)
    birthdays_enabled = Column(Boolean, nullable=False, default=True)
    death_anniversaries_enabled = Column(Boolean, nullable=False, default=True)
    
    # Gallery and member update settings
    gallery_updates_enabled = Column(Boolean, nullable=False, default=True)
    member_updates_enabled = Column(Boolean, nullable=False, default=False)
    
    # Timestamps
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="notification_settings")
    tree = relationship("Tree", back_populates="notification_settings")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'tree_id', name='unique_user_tree_notification_settings'),
    )
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'user_id': str(self.user_id),
            'tree_id': str(self.tree_id),
            'events_enabled': self.events_enabled,
            'birthdays_enabled': self.birthdays_enabled,
            'death_anniversaries_enabled': self.death_anniversaries_enabled,
            'gallery_updates_enabled': self.gallery_updates_enabled,
            'member_updates_enabled': self.member_updates_enabled,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class GlobalNotificationPreferences(Base):
    """Global notification preferences for users"""
    __tablename__ = 'global_notification_preferences'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    
    # Global notification settings
    email_notifications_enabled = Column(Boolean, nullable=False, default=True)
    weekly_digest_enabled = Column(Boolean, nullable=False, default=True)
    push_notifications_enabled = Column(Boolean, nullable=False, default=True)
    digest_day_of_week = Column(Integer, nullable=False, default=1)  # 1 = Monday, 7 = Sunday
    
    # Timestamps
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="global_notification_preferences")
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'user_id': str(self.user_id),
            'email_notifications_enabled': self.email_notifications_enabled,
            'weekly_digest_enabled': self.weekly_digest_enabled,
            'push_notifications_enabled': self.push_notifications_enabled,
            'digest_day_of_week': self.digest_day_of_week,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
