"""JWT token generation and verification utilities."""

import os
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from uuid import UUID
import logging
import pytz

logger = logging.getLogger(__name__)

# Configuration
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', '43200'))  # 30 days default


def create_access_token(user_id: UUID, email: str, expires_delta: Optional[timedelta] = None) -> str:
    """Generate a JWT access token for a user.
    
    Args:
        user_id: The user's unique identifier
        email: The user's email address
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token string
    """
    to_encode: Dict[str, Any] = {
        "sub": str(user_id),  # Subject (user ID)
        "email": email,
        "iat": datetime.now(timezone.utc).astimezone(pytz.timezone('Africa/Nairobi')),  # Issued at
    }
    
    if expires_delta:
        expire = datetime.now(timezone.utc).astimezone(pytz.timezone('Africa/Nairobi')) + expires_delta
    else:
        expire = datetime.now(timezone.utc).astimezone(pytz.timezone('Africa/Nairobi')) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode["exp"] = expire
    
    try:
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    except Exception as e:
        logger.error(f"Failed to create access token: {e}")
        raise


def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify and decode a JWT access token.
    
    Args:
        token: The JWT token string to verify
        
    Returns:
        Dictionary containing token payload if valid, None if invalid
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Check expiration
        exp = payload.get("exp")
        if exp and datetime.fromtimestamp(exp, tz=pytz.timezone('Africa/Nairobi')) < datetime.now(timezone.utc).astimezone(pytz.timezone('Africa/Nairobi')):
            logger.warning("Token has expired")
            return None
            
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token signature has expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        return None
    except Exception as e:
        logger.error(f"Error verifying token: {e}")
        return None


def decode_token_payload(token: str) -> Optional[Dict[str, Any]]:
    """Decode token payload without verification (for debugging only).
    
    Args:
        token: The JWT token string
        
    Returns:
        Dictionary containing token payload
    """
    try:
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload
    except Exception as e:
        logger.error(f"Failed to decode token: {e}")
        return None
