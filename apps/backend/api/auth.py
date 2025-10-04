"""Authentication endpoints for OTP-based passwordless login."""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import uuid
import logging
import pytz

import models
import schemas
from utils import db, auth as auth_utils, rate_limit as rate_limiter
from utils.dependencies import get_current_user, SESSION_COOKIE_NAME
from services.email import send_email

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Authentication"])


@router.post('/auth/otp/request', status_code=status.HTTP_200_OK)
def request_otp(
    payload: schemas.OTPRequest,
    background_tasks: BackgroundTasks,
    db_session: Session = Depends(db.get_db)
):
    """Request an OTP code for email-based authentication.
    
    Rate limit: 3 requests per email per 15 minutes.
    
    Args:
        payload: OTP request with email address
        background_tasks: FastAPI background tasks
        db_session: Database session
        
    Returns:
        Success message
        
    Raises:
        HTTPException 429: Too many requests (rate limit exceeded)
    """
    # Check rate limiting
    is_allowed, remaining = rate_limiter.check_rate_limit(
        key=f"otp_request:{payload.email}",
        max_requests=3,
        window_minutes=15
    )
    
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many OTP requests. Please try again in 15 minutes."
        )
    
    # For login (not registration), check if user exists
    if not payload.is_registration:
        user = db_session.query(models.User).filter(
            models.User.email == payload.email
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found with this email. Please register first."
            )
    
    # Generate 6-digit OTP
    code = f"{uuid.uuid4().int % 1000000:06d}"
    # Store expiration as naive UTC datetime to avoid timezone comparison issues
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    # Remove timezone info for database storage
    expires_at = expires_at.replace(tzinfo=None)
    
    # Store OTP in database
    otp = models.OTPCode(
        email=payload.email,
        code=code,
        expires_at=expires_at,
        used_at=None
    )
    db_session.add(otp)
    db_session.commit()
    
    logger.info(f"OTP generated for {payload.email}, expires at {expires_at}")
    
    # Send OTP email asynchronously
    background_tasks.add_task(
        send_email,
        to=payload.email,
        subject="Your Verification Code - Family Tree",
        template_name="otp",
        template_data={"code": code}
    )
    
    return {
        "status": "ok",
        "message": "Verification code sent to your email",
        "remaining_requests": remaining
    }


@router.post('/auth/otp/verify', status_code=status.HTTP_200_OK)
def verify_otp(
    payload: schemas.OTPVerify,
    response: Response,
    db_session: Session = Depends(db.get_db)
):
    """Verify OTP code and create/update user session.
    
    On success:
    - Creates or updates user record
    - Generates JWT session token
    - Sets HttpOnly secure cookie
    - Marks OTP as used
    
    Args:
        payload: OTP verification with email and code
        response: FastAPI response object
        db_session: Database session
        
    Returns:
        User data and access token
        
    Raises:
        HTTPException 400: Invalid or expired code
    """
    # Use naive UTC datetime for consistent comparison with database
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    
    # Find valid OTP
    otp = db_session.query(models.OTPCode).filter(
        models.OTPCode.email == payload.email,
        models.OTPCode.code == payload.code,
        models.OTPCode.used_at.is_(None)
    ).order_by(models.OTPCode.created_at.desc()).first()
    
    if not otp:
        logger.warning(f"Invalid OTP attempt for {payload.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )
    
    # Check expiration - both datetimes are now naive UTC
    if otp.expires_at < now:
        logger.warning(f"Expired OTP attempt for {payload.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired"
        )
    
    # Mark OTP as used
    otp.used_at = now
    db_session.add(otp)
    
    # Create or get user
    user = db_session.query(models.User).filter(
        models.User.email == payload.email
    ).first()
    
    if not user:
        # Create new user
        display_name = payload.display_name or payload.email.split('@')[0]
        user = models.User(
            email=payload.email,
            display_name=display_name
        )
        db_session.add(user)
        db_session.flush()  # Get the user ID
        logger.info(f"New user created: {user.id} with display_name: {display_name}")
    else:
        # Update display_name if provided (allows users to update during login)
        if payload.display_name and payload.display_name != user.display_name:
            user.display_name = payload.display_name
            logger.info(f"User {user.id} display_name updated to: {payload.display_name}")
        logger.info(f"Existing user logged in: {user.id}")
    
    db_session.commit()
    
    # Generate JWT token
    access_token = auth_utils.create_access_token(
        user_id=user.id,
        email=user.email
    )
    
    # Set HttpOnly secure cookie
    cookie_max_age = 30 * 24 * 60 * 60  # 30 days in seconds
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=True,  # Set to True in production with HTTPS
        samesite="lax",
        max_age=cookie_max_age
    )
    
    # Reset rate limit for this email
    rate_limiter.reset_rate_limit(f"otp_request:{payload.email}")
    
    return {
        "status": "verified",
        "user": schemas.UserRead.model_validate(user),
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": cookie_max_age
    }


@router.get('/auth/me', response_model=schemas.UserRead)
async def get_current_user_info(
    current_user: models.User = Depends(get_current_user)
):
    """Get current authenticated user information.
    
    Requires valid session token (cookie or Authorization header).
    
    Args:
        current_user: Injected current user from dependencies
        
    Returns:
        Current user data
    """
    return current_user


@router.post('/auth/logout', status_code=status.HTTP_200_OK)
async def logout(response: Response):
    """Logout current user by clearing session cookie.
    
    Args:
        response: FastAPI response object
        
    Returns:
        Success message
    """
    # Clear session cookie
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        httponly=True,
        secure=True,
        samesite="lax"
    )
    
    return {"status": "ok", "message": "Logged out successfully"}


@router.post('/auth/refresh', status_code=status.HTTP_200_OK)
async def refresh_token(
    current_user: models.User = Depends(get_current_user),
    response: Response = None
):
    """Refresh the authentication token for the current user.
    
    Generates a new JWT token with extended expiration.
    
    Args:
        current_user: Injected current user from dependencies
        response: FastAPI response object
        
    Returns:
        New access token
    """
    # Generate new JWT token
    access_token = auth_utils.create_access_token(
        user_id=current_user.id,
        email=current_user.email
    )
    
    # Update cookie
    cookie_max_age = 30 * 24 * 60 * 60  # 30 days
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=cookie_max_age
    )
    
    return {
        "status": "ok",
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": cookie_max_age
    }

