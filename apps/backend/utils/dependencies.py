"""FastAPI dependencies for authentication and authorization."""

from typing import Optional, Callable, Literal
from functools import wraps
from fastapi import Depends, HTTPException, status, Cookie, Header
from sqlalchemy.orm import Session
from uuid import UUID
import models
from utils import db, auth as auth_utils
from utils.permissions import require_membership as _require_membership

# Cookie name for JWT token
SESSION_COOKIE_NAME = "family_tree_session"

# Role types
RoleType = Literal["custodian", "contributor", "viewer"]


async def get_current_user(
    session_token: Optional[str] = Cookie(None, alias=SESSION_COOKIE_NAME),
    authorization: Optional[str] = Header(None),
    db_session: Session = Depends(db.get_db)
) -> models.User:
    """Dependency to get the current authenticated user.
    
    Checks for JWT token in:
    1. HttpOnly session cookie
    2. Authorization header (Bearer token)
    
    Args:
        session_token: JWT token from cookie
        authorization: Authorization header value
        db_session: Database session
        
    Returns:
        User model instance
        
    Raises:
        HTTPException: 401 if not authenticated or token invalid
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Try to get token from cookie or Authorization header
    token = None
    if session_token:
        token = session_token
    elif authorization:
        # Extract Bearer token
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
    
    if not token:
        raise credentials_exception
    
    # Verify token
    payload = auth_utils.verify_access_token(token)
    if not payload:
        raise credentials_exception
    
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise credentials_exception
    
    try:
        user_id = UUID(user_id_str)
    except ValueError:
        raise credentials_exception
    
    # Get user from database
    user = db_session.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise credentials_exception
    
    return user


async def get_current_user_optional(
    session_token: Optional[str] = Cookie(None, alias=SESSION_COOKIE_NAME),
    authorization: Optional[str] = Header(None),
    db_session: Session = Depends(db.get_db)
) -> Optional[models.User]:
    """Dependency to optionally get the current authenticated user.
    
    Similar to get_current_user but returns None instead of raising exception.
    
    Args:
        session_token: JWT token from cookie
        authorization: Authorization header value
        db_session: Database session
        
    Returns:
        User model instance or None if not authenticated
    """
    try:
        return await get_current_user(session_token, authorization, db_session)
    except HTTPException:
        return None


def require_role(tree_id: UUID, required_role: str):
    """Dependency factory to check user role for a specific tree.
    
    DEPRECATED: Use require_tree_role() instead for better flexibility.
    
    Args:
        tree_id: The tree ID to check permissions for
        required_role: Required role ('custodian', 'contributor', 'viewer')
        
    Returns:
        Dependency function
    """
    async def check_role(
        current_user: models.User = Depends(get_current_user),
        db_session: Session = Depends(db.get_db)
    ):
        # Use the centralized permission checking utility
        _require_membership(
            current_user.id,
            tree_id,
            db_session,
            required_role
        )
        
        return current_user
    
    return check_role


def require_tree_role(required_role: RoleType):
    """Create a dependency that requires a specific role for a tree from path parameters.
    
    This is a more flexible version that works with FastAPI path parameters.
    The tree_id will be extracted from the path parameters automatically.
    
    Args:
        required_role: Minimum required role ('custodian', 'contributor', 'viewer')
        
    Returns:
        Dependency function that validates role and returns user
        
    Example:
        @router.patch('/trees/{tree_id}')
        def update_tree(
            tree_id: UUID,
            user: models.User = Depends(require_tree_role("custodian"))
        ):
            # Only custodians can access this endpoint
            pass
    """
    async def validate_role(
        tree_id: UUID,
        current_user: models.User = Depends(get_current_user),
        db_session: Session = Depends(db.get_db)
    ):
        # Use the centralized permission checking utility
        _require_membership(
            current_user.id,
            tree_id,
            db_session,
            required_role
        )
        
        return current_user
    
    return validate_role


def require_custodian():
    """Create a dependency that requires custodian role.
    
    Shorthand for require_tree_role("custodian").
    
    Returns:
        Dependency function
        
    Example:
        @router.delete('/trees/{tree_id}')
        def delete_tree(
            tree_id: UUID,
            user: models.User = Depends(require_custodian())
        ):
            # Only custodians can delete trees
            pass
    """
    return require_tree_role("custodian")


def require_contributor():
    """Create a dependency that requires contributor role or higher.
    
    Shorthand for require_tree_role("contributor").
    
    Returns:
        Dependency function
    """
    return require_tree_role("contributor")


def require_viewer():
    """Create a dependency that requires viewer role or higher (any member).
    
    Shorthand for require_tree_role("viewer").
    
    Returns:
        Dependency function
    """
    return require_tree_role("viewer")
