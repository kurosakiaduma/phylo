from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, func, Text, JSON, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from utils.db import Base

class User(Base):
    __tablename__ = 'users'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String)
    avatar_url = Column(String, nullable=True)  # URL to user's avatar image
    
    # Demographics
    dob = Column(String, nullable=True)  # ISO 8601 date string (YYYY-MM-DD)
    gender = Column(String, nullable=True)  # Open-ended gender identity
    pronouns = Column(String, nullable=True)  # e.g., "they/them", "she/her", "he/him", custom
    bio = Column(Text, nullable=True)  # Short biography
    phone = Column(String, nullable=True)
    location = Column(String, nullable=True)  # City, Country or free text
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    notification_settings = relationship("NotificationSettings", back_populates="user", cascade="all, delete-orphan")
    global_notification_preferences = relationship("GlobalNotificationPreferences", back_populates="user", uselist=False, cascade="all, delete-orphan")
    uploaded_photos = relationship("GalleryPhoto", foreign_keys="GalleryPhoto.uploaded_by", back_populates="uploader")

class Tree(Base):
    __tablename__ = 'trees'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(Text)
    settings_json = Column(JSON)
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    notification_settings = relationship("NotificationSettings", back_populates="tree", cascade="all, delete-orphan")
    gallery_photos = relationship("GalleryPhoto", back_populates="tree", cascade="all, delete-orphan")

class Membership(Base):
    __tablename__ = 'memberships'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, index=True)
    tree_id = Column(UUID(as_uuid=True), ForeignKey('trees.id'), nullable=False, index=True)
    role = Column(String, nullable=False)
    joined_at = Column(DateTime, server_default=func.now())
    
    __table_args__ = (
        Index('ix_memberships_user_tree', 'user_id', 'tree_id', unique=True),
    )

class Member(Base):
    __tablename__ = 'members'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tree_id = Column(UUID(as_uuid=True), ForeignKey('trees.id'), index=True, nullable=False)
    name = Column(String, index=True, nullable=False)
    email = Column(String, unique=False, nullable=True, index=True)  # Unique constraint handled by partial index
    avatar_url = Column(String, nullable=True)  # URL to member's avatar image
    
    # Demographics
    dob = Column(String, nullable=True)  # ISO 8601 date string (YYYY-MM-DD)
    dod = Column(String, nullable=True)  # Date of death (ISO 8601)
    gender = Column(String, nullable=True)  # Open-ended gender identity
    pronouns = Column(String, nullable=True)  # Preferred pronouns
    
    # Additional Info
    deceased = Column(Boolean, default=False)
    birth_place = Column(String, nullable=True)
    death_place = Column(String, nullable=True)
    occupation = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)  # Private custodian notes
    
    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    updated_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    
    # Relationships
    gallery_photos = relationship("GalleryPhoto", back_populates="member", cascade="all, delete-orphan")

class Relationship(Base):
    __tablename__ = 'relationships'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tree_id = Column(UUID(as_uuid=True), ForeignKey('trees.id'), index=True, nullable=False)
    type = Column(String, nullable=False, index=True) # e.g., 'spouse', 'parent-child'
    a_member_id = Column(UUID(as_uuid=True), ForeignKey('members.id'), index=True, nullable=False)
    b_member_id = Column(UUID(as_uuid=True), ForeignKey('members.id'), index=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    __table_args__ = (
        Index('ix_relationships_tree_type', 'tree_id', 'type'),
        Index('ix_relationships_members', 'a_member_id', 'b_member_id'),
    )

class Invite(Base):
    __tablename__ = 'invites'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tree_id = Column(UUID(as_uuid=True), ForeignKey('trees.id'), index=True, nullable=False)
    member_id = Column(UUID(as_uuid=True), ForeignKey('members.id'), index=True, nullable=True)  # Member this invite is for
    email = Column(String, index=True, nullable=False)
    role = Column(String, nullable=False)
    token = Column(String, nullable=False, unique=True)
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    resend_count = Column(Integer, default=0, nullable=False)  # Track number of resends
    created_at = Column(DateTime, server_default=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)  # Who sent the invite

class OTPCode(Base):
    __tablename__ = 'otp_codes'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, index=True, nullable=False)
    code = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

class Event(Base):
    __tablename__ = 'events'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tree_id = Column(UUID(as_uuid=True), ForeignKey('trees.id'), index=True, nullable=False)
    
    # Event Details
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    event_type = Column(String, nullable=False, index=True)  # 'birthday', 'anniversary', 'wedding', 'death', 'graduation', 'custom', etc.
    event_date = Column(String, nullable=False)  # ISO 8601 date (YYYY-MM-DD) or datetime
    end_date = Column(String, nullable=True)  # For multi-day events
    location = Column(String, nullable=True)
    
    # Associations
    member_ids = Column(JSON, nullable=True)  # Array of member UUIDs associated with this event
    is_recurring = Column(Boolean, default=False)  # For birthdays/anniversaries
    recurrence_rule = Column(String, nullable=True)  # 'yearly', 'monthly', etc.
    
    # Privacy & Metadata
    is_public = Column(Boolean, default=True)  # Visible to all tree members
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        Index('ix_events_tree_date', 'tree_id', 'event_date'),
        Index('ix_events_tree_type', 'tree_id', 'event_type'),
    )

class Photo(Base):
    __tablename__ = 'photos'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tree_id = Column(UUID(as_uuid=True), ForeignKey('trees.id'), index=True, nullable=False)
    
    # Photo Details
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    photo_url = Column(String, nullable=False)  # URL to the photo file
    thumbnail_url = Column(String, nullable=True)  # Optimized thumbnail
    
    # Photo Metadata
    taken_date = Column(String, nullable=True)  # When the photo was taken (ISO 8601)
    location = Column(String, nullable=True)  # Where the photo was taken
    
    # Associations
    member_ids = Column(JSON, nullable=True)  # Array of member UUIDs tagged in this photo
    event_id = Column(UUID(as_uuid=True), ForeignKey('events.id'), nullable=True, index=True)  # Associated event
    is_family_photo = Column(Boolean, default=False)  # Family photo vs individual
    
    # Privacy & Metadata
    is_public = Column(Boolean, default=True)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        Index('ix_photos_tree_date', 'tree_id', 'taken_date'),
        Index('ix_photos_tree_family', 'tree_id', 'is_family_photo'),
    )

# Import new models
from .notification_settings import NotificationSettings, GlobalNotificationPreferences
from .gallery_photo import GalleryPhoto
