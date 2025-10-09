from typing import Optional, Any, Dict, List
from datetime import datetime
from uuid import UUID

try:
    # Pydantic v2
    from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

    PYDANTIC_V2 = True
except Exception:
    # Pydantic v1 fallback
    from pydantic import BaseModel, EmailStr, Field, validator

    PYDANTIC_V2 = False


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    pronouns: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None

class UserCreate(UserBase):
    pass

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    pronouns: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None

class UserRead(UserBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    if PYDANTIC_V2:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            orm_mode = True


# Tree Schemas
class TreeSettings(BaseModel):
    """Tree settings with support for both snake_case and camelCase (frontend compatibility)."""
    allow_same_sex: bool = Field(True, alias='allowSameSex')
    monogamy: bool = True
    allow_polygamy: bool = Field(False, alias='allowPolygamy')
    max_spouses_per_member: Optional[int] = Field(None, alias='maxSpousesPerMember')
    allow_single_parent: bool = Field(True, alias='allowSingleParent')
    allow_multi_parent_children: bool = Field(False, alias='allowMultiParentChildren')
    max_parents_per_child: Optional[int] = Field(2, alias='maxParentsPerChild')

    if PYDANTIC_V2:
        model_config = ConfigDict(populate_by_name=True)
    else:
        class Config:
            allow_population_by_field_name = True

class TreeBase(BaseModel):
    name: str
    description: Optional[str] = None
    settings: Optional[TreeSettings] = None

class TreeCreate(TreeBase):
    pass

class TreeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    settings: Optional[TreeSettings] = None

class TreeRead(TreeBase):
    id: UUID
    created_by: UUID
    created_at: datetime
    settings: TreeSettings

    if PYDANTIC_V2:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            orm_mode = True


# Extended Tree Schemas for API responses
class TreeWithMembership(TreeRead):
    """Tree with user's membership information."""
    role: str  # User's role in this tree
    joined_at: datetime
    member_count: int = 0


class MembershipInfo(BaseModel):
    """Information about a tree membership."""
    user_id: UUID
    user_email: str
    user_display_name: Optional[str] = None
    role: str
    joined_at: datetime

    if PYDANTIC_V2:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            orm_mode = True


class MembershipUpdate(BaseModel):
    """Schema for updating a membership role."""
    role: str  # 'custodian', 'contributor', 'viewer'


class MembershipRead(BaseModel):
    """Full membership information."""
    id: UUID
    user_id: UUID
    tree_id: UUID
    role: str
    joined_at: datetime

    if PYDANTIC_V2:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            orm_mode = True


class TreeDetail(TreeRead):
    """Detailed tree information including memberships and statistics."""
    user_role: str  # Current user's role
    member_count: int = 0
    relationship_count: int = 0
    memberships: list['MembershipInfo'] = []


# Member Schemas
class MemberBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    avatar_url: Optional[str] = None
    dob: Optional[str] = None  # ISO 8601 date string (YYYY-MM-DD)
    dod: Optional[str] = None  # Date of death (ISO 8601)
    gender: Optional[str] = None
    pronouns: Optional[str] = None
    deceased: bool = False
    birth_place: Optional[str] = None
    death_place: Optional[str] = None
    occupation: Optional[str] = None
    bio: Optional[str] = None
    notes: Optional[str] = None  # Private custodian notes

    @field_validator('email', mode='before')
    @classmethod
    def validate_email(cls, v):
        """Convert empty string to None for email field"""
        if v == "" or v is None:
            return None
        return v

class MemberCreate(MemberBase):
    """Schema for creating a member. tree_id comes from path parameter."""
    pass

class MemberUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    avatar_url: Optional[str] = None
    dob: Optional[str] = None
    dod: Optional[str] = None
    gender: Optional[str] = None
    pronouns: Optional[str] = None
    deceased: Optional[bool] = None
    birth_place: Optional[str] = None
    death_place: Optional[str] = None
    occupation: Optional[str] = None
    bio: Optional[str] = None
    notes: Optional[str] = None

    @field_validator('email', mode='before')
    @classmethod
    def validate_email(cls, v):
        """Convert empty string to None for email field"""
        if v == "" or v is None:
            return None
        return v

class MemberRead(MemberBase):
    id: UUID
    tree_id: UUID
    created_at: datetime
    updated_at: datetime
    updated_by: Optional[UUID] = None

    if PYDANTIC_V2:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            orm_mode = True


# Relationship Schemas
class RelationshipBase(BaseModel):
    type: str  # 'spouse', 'parent-child', etc.
    a_member_id: UUID
    b_member_id: UUID

class RelationshipCreate(RelationshipBase):
    tree_id: UUID

class RelationshipRead(RelationshipBase):
    id: UUID
    tree_id: UUID
    created_at: datetime

    if PYDANTIC_V2:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            orm_mode = True


# Invite Schemas
class InviteBase(BaseModel):
    email: EmailStr
    role: str  # 'custodian', 'contributor', 'viewer'

class InviteCreate(InviteBase):
    tree_id: UUID
    member_id: Optional[UUID] = None  # Optional member this invite is for

class InviteRead(InviteBase):
    id: UUID
    tree_id: UUID
    member_id: Optional[UUID] = None
    token: str
    expires_at: datetime
    accepted_at: Optional[datetime] = None
    resend_count: int = 0
    created_at: datetime
    created_by: Optional[UUID] = None

    if PYDANTIC_V2:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            orm_mode = True


class InviteDetail(InviteBase):
    """Detailed invite information with tree context."""
    id: UUID
    tree_id: UUID
    tree_name: str
    tree_description: Optional[str] = None
    token: str
    expires_at: datetime
    created_at: datetime
    inviter_name: Optional[str] = None
    member_name: Optional[str] = None  # Name of the member being invited (for personalized messages)

    if PYDANTIC_V2:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            orm_mode = True


# Email Check Schema
class EmailCheck(BaseModel):
    email: EmailStr


# OTP Schemas
class OTPRequest(BaseModel):
    email: EmailStr
    is_registration: bool = False  # True for registration, False for login

class OTPVerify(BaseModel):
    email: EmailStr
    code: str
    display_name: Optional[str] = None  # Required for registration


# Token/Session Schemas
class TokenData(BaseModel):
    user_id: UUID
    email: EmailStr
    exp: Optional[datetime] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


# Event Schemas
class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: str  # 'birthday', 'anniversary', 'wedding', 'death', 'graduation', 'custom', etc.
    event_date: str  # ISO 8601 date (YYYY-MM-DD)
    end_date: Optional[str] = None  # For multi-day events
    location: Optional[str] = None
    member_ids: Optional[list[str]] = None  # List of member UUIDs
    is_recurring: bool = False
    recurrence_rule: Optional[str] = None  # 'yearly', 'monthly', etc.
    is_public: bool = True

class EventCreate(EventBase):
    """Schema for creating an event. tree_id comes from path parameter."""
    pass

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_type: Optional[str] = None
    event_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None
    member_ids: Optional[list[str]] = None
    is_recurring: Optional[bool] = None
    recurrence_rule: Optional[str] = None
    is_public: Optional[bool] = None

class EventRead(EventBase):
    id: UUID
    tree_id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    if PYDANTIC_V2:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            orm_mode = True


# Photo/Gallery Schemas
class PhotoBase(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    taken_date: Optional[str] = None  # ISO 8601 date
    location: Optional[str] = None
    member_ids: Optional[list[str]] = None  # List of member UUIDs tagged
    event_id: Optional[UUID] = None
    is_family_photo: bool = False
    is_public: bool = True

class PhotoCreate(PhotoBase):
    """Schema for creating a photo. tree_id comes from path parameter."""
    # photo_url will be set by the upload endpoint
    pass

class PhotoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    taken_date: Optional[str] = None
    location: Optional[str] = None
    member_ids: Optional[list[str]] = None
    event_id: Optional[UUID] = None
    is_family_photo: Optional[bool] = None
    is_public: Optional[bool] = None

class PhotoRead(PhotoBase):
    id: UUID
    tree_id: UUID
    photo_url: str
    thumbnail_url: Optional[str] = None
    uploaded_by: UUID
    created_at: datetime
    updated_at: datetime

    if PYDANTIC_V2:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            orm_mode = True


# Relationship Computation Schema
class RelationshipComputeResponse(BaseModel):
    """Response for relationship computation between two members."""
    from_member_id: UUID
    from_member_name: str
    to_member_id: UUID
    to_member_name: str
    relationship: str
    path: List[UUID]
    path_names: List[str]
    
    if PYDANTIC_V2:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            orm_mode = True

