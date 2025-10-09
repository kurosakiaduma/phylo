"""add_notification_settings_and_gallery_photos_tables

Revision ID: 1a6fde5cdda9
Revises: 20251002_095000
Create Date: 2025-10-06 17:23:41.932796

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1a6fde5cdda9'
down_revision = '20251002_095000'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create notification_settings table
    op.create_table(
        'notification_settings',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('tree_id', sa.UUID(), nullable=False),
        sa.Column('events_enabled', sa.Boolean(), nullable=False, default=True),
        sa.Column('birthdays_enabled', sa.Boolean(), nullable=False, default=True),
        sa.Column('death_anniversaries_enabled', sa.Boolean(), nullable=False, default=True),
        sa.Column('gallery_updates_enabled', sa.Boolean(), nullable=False, default=True),
        sa.Column('member_updates_enabled', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('NOW()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tree_id'], ['trees.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id', 'tree_id', name='unique_user_tree_notification_settings')
    )
    
    # Create indexes for notification_settings
    op.create_index('idx_notification_settings_user_id', 'notification_settings', ['user_id'])
    op.create_index('idx_notification_settings_tree_id', 'notification_settings', ['tree_id'])
    
    # Create gallery_photos table
    op.create_table(
        'gallery_photos',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('tree_id', sa.UUID(), nullable=False),
        sa.Column('member_id', sa.UUID(), nullable=True),  # Nullable for general tree photos
        sa.Column('uploaded_by', sa.UUID(), nullable=False),
        sa.Column('file_path', sa.Text(), nullable=False),
        sa.Column('original_filename', sa.Text(), nullable=True),
        sa.Column('caption', sa.Text(), nullable=True),
        sa.Column('approved', sa.Boolean(), nullable=False, default=False),
        sa.Column('approved_by', sa.UUID(), nullable=True),
        sa.Column('approved_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('mime_type', sa.String(100), nullable=True),
        sa.Column('width', sa.Integer(), nullable=True),
        sa.Column('height', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('NOW()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['tree_id'], ['trees.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['member_id'], ['members.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ondelete='SET NULL')
    )
    
    # Create indexes for gallery_photos
    op.create_index('idx_gallery_photos_tree_id', 'gallery_photos', ['tree_id'])
    op.create_index('idx_gallery_photos_member_id', 'gallery_photos', ['member_id'])
    op.create_index('idx_gallery_photos_uploaded_by', 'gallery_photos', ['uploaded_by'])
    op.create_index('idx_gallery_photos_approved', 'gallery_photos', ['approved'])
    op.create_index('idx_gallery_photos_created_at', 'gallery_photos', ['created_at'])
    
    # Create global notification preferences table
    op.create_table(
        'global_notification_preferences',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('email_notifications_enabled', sa.Boolean(), nullable=False, default=True),
        sa.Column('weekly_digest_enabled', sa.Boolean(), nullable=False, default=True),
        sa.Column('push_notifications_enabled', sa.Boolean(), nullable=False, default=True),
        sa.Column('digest_day_of_week', sa.Integer(), nullable=False, default=1),  # 1 = Monday
        sa.Column('created_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=False, server_default=sa.text('NOW()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id', name='unique_user_global_notification_preferences')
    )
    
    # Create index for global notification preferences
    op.create_index('idx_global_notification_preferences_user_id', 'global_notification_preferences', ['user_id'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('global_notification_preferences')
    op.drop_table('gallery_photos')
    op.drop_table('notification_settings')
