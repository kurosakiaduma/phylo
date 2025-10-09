"""Celery tasks for background job processing.

Tasks:
- cleanup_expired_invites: Removes expired invitations
"""

from celery import Celery
from celery.schedules import crontab
from datetime import datetime
from sqlalchemy import create_engine, and_
from sqlalchemy.orm import sessionmaker
import os
import logging

logger = logging.getLogger(__name__)

# Initialize Celery
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
celery_app = Celery("family_tree", broker=REDIS_URL, backend=REDIS_URL)

# Configure Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    beat_schedule={
        'cleanup-expired-invites': {
            'task': 'tasks.celery_tasks.cleanup_expired_invites',
            'schedule': crontab(hour=2, minute=0),  # Run daily at 2 AM UTC
        },
    },
)

# Database setup for tasks
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@celery_app.task(name="tasks.celery_tasks.cleanup_expired_invites")
def cleanup_expired_invites():
    """Clean up expired and unaccepted invitations.
    
    Runs daily at 2 AM UTC. Removes:
    - Invites that have expired and not been accepted
    - Invites older than 30 days (even if not expired)
    
    Returns:
        Dict with cleanup statistics
    """
    from models import Invite  # Import here to avoid circular dependencies
    
    session = SessionLocal()
    try:
        now = datetime.utcnow()
        thirty_days_ago = datetime.utcnow().replace(day=1)  # Simple 30-day check
        
        # Find expired, unaccepted invites
        expired_query = session.query(Invite).filter(
            and_(
                Invite.accepted_at.is_(None),
                Invite.expires_at < now
            )
        )
        
        expired_count = expired_query.count()
        
        # Delete expired invites
        expired_query.delete(synchronize_session=False)
        
        # Find very old invites (30+ days, regardless of expiry)
        old_query = session.query(Invite).filter(
            and_(
                Invite.accepted_at.is_(None),
                Invite.created_at < thirty_days_ago
            )
        )
        
        old_count = old_query.count()
        
        # Delete old invites
        old_query.delete(synchronize_session=False)
        
        session.commit()
        
        total_removed = expired_count + old_count
        
        logger.info(
            f"Cleanup completed: Removed {total_removed} invites "
            f"({expired_count} expired, {old_count} old)"
        )
        
        return {
            "success": True,
            "expired_removed": expired_count,
            "old_removed": old_count,
            "total_removed": total_removed,
            "timestamp": now.isoformat()
        }
        
    except Exception as e:
        session.rollback()
        logger.error(f"Error during invite cleanup: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
    finally:
        session.close()


@celery_app.task(name="tasks.celery_tasks.cleanup_accepted_invites")
def cleanup_accepted_invites(days_old: int = 90):
    """Clean up accepted invitations older than N days.
    
    Keeps database tidy by removing old accepted invites.
    Can be run manually or scheduled.
    
    Args:
        days_old: Remove accepted invites older than this many days (default: 90)
        
    Returns:
        Dict with cleanup statistics
    """
    from models import Invite
    from datetime import timedelta
    
    session = SessionLocal()
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        
        # Find old accepted invites
        query = session.query(Invite).filter(
            and_(
                Invite.accepted_at.is_not(None),
                Invite.accepted_at < cutoff_date
            )
        )
        
        count = query.count()
        
        # Delete old accepted invites
        query.delete(synchronize_session=False)
        
        session.commit()
        
        logger.info(f"Cleanup completed: Removed {count} accepted invites older than {days_old} days")
        
        return {
            "success": True,
            "removed": count,
            "days_old": days_old,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        session.rollback()
        logger.error(f"Error during accepted invite cleanup: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
    finally:
        session.close()


if __name__ == "__main__":
    # For testing
    print("Testing cleanup_expired_invites task...")
    result = cleanup_expired_invites()
    print(f"Result: {result}")
