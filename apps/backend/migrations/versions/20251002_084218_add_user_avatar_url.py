"""add user avatar_url

Revision ID: 20251002_084218
Revises: 996fe3ad69c3
Create Date: 2025-10-02 08:42:18

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251002_084218'
down_revision = '996fe3ad69c3'  # Previous migration revision
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add avatar_url column to users table."""
    op.add_column('users', sa.Column('avatar_url', sa.String(), nullable=True))


def downgrade() -> None:
    """Remove avatar_url column from users table."""
    op.drop_column('users', 'avatar_url')
