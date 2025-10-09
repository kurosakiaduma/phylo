"""Rate limiting utilities for API endpoints."""

from datetime import datetime, timedelta, timezone
from typing import Dict, Tuple
from collections import defaultdict
import logging
import pytz

logger = logging.getLogger(__name__)

# In-memory rate limit store (use Redis in production)
# Structure: {key: [(timestamp1, timestamp2, ...)]}
_rate_limit_store: Dict[str, list] = defaultdict(list)


def check_rate_limit(
    key: str,
    max_requests: int = 3,
    window_minutes: int = 15
) -> Tuple[bool, int]:
    """Check if a request is within rate limits.
    
    Args:
        key: Unique identifier for rate limiting (e.g., email address)
        max_requests: Maximum number of requests allowed
        window_minutes: Time window in minutes
        
    Returns:
        Tuple of (is_allowed, remaining_requests)
    """
    now = datetime.now(timezone.utc).astimezone(pytz.timezone('Africa/Nairobi'))
    window_start = now - timedelta(minutes=window_minutes)
    
    # Clean up old entries
    _rate_limit_store[key] = [
        timestamp for timestamp in _rate_limit_store[key]
        if timestamp > window_start
    ]
    
    current_count = len(_rate_limit_store[key])
    
    if current_count >= max_requests:
        logger.warning(f"Rate limit exceeded for key: {key}")
        return False, 0
    
    # Add current request
    _rate_limit_store[key].append(now)
    remaining = max_requests - (current_count + 1)
    
    return True, remaining


def reset_rate_limit(key: str) -> None:
    """Reset rate limit for a specific key.
    
    Args:
        key: Unique identifier to reset
    """
    if key in _rate_limit_store:
        del _rate_limit_store[key]
        logger.info(f"Rate limit reset for key: {key}")


def cleanup_expired_entries(window_minutes: int = 15) -> int:
    """Clean up expired rate limit entries.
    
    Args:
        window_minutes: Age threshold for cleanup
        
    Returns:
        Number of entries cleaned up
    """
    now = datetime.now(timezone.utc).astimezone(pytz.timezone('Africa/Nairobi'))
    window_start = now - timedelta(minutes=window_minutes)
    cleaned_count = 0
    
    keys_to_delete = []
    for key, timestamps in _rate_limit_store.items():
        # Filter out old timestamps
        valid_timestamps = [ts for ts in timestamps if ts > window_start]
        
        if not valid_timestamps:
            keys_to_delete.append(key)
            cleaned_count += 1
        else:
            _rate_limit_store[key] = valid_timestamps
    
    for key in keys_to_delete:
        del _rate_limit_store[key]
    
    if cleaned_count > 0:
        logger.info(f"Cleaned up {cleaned_count} expired rate limit entries")
    
    return cleaned_count
