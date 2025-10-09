"""add_member_id_and_resend_count_to_invites

Revision ID: e8ce069a8c8b
Revises: 1a6fde5cdda9
Create Date: 2025-10-07 11:49:40.229125

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e8ce069a8c8b'
down_revision = '1a6fde5cdda9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add member_id column to invites table
    op.add_column('invites', sa.Column('member_id', sa.UUID(), nullable=True))
    op.add_column('invites', sa.Column('resend_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('invites', sa.Column('created_by', sa.UUID(), nullable=True))
    
    # Create foreign key constraints
    op.create_foreign_key('fk_invites_member_id', 'invites', 'members', ['member_id'], ['id'])
    op.create_foreign_key('fk_invites_created_by', 'invites', 'users', ['created_by'], ['id'])
    
    # Create indexes
    op.create_index('idx_invites_member_id', 'invites', ['member_id'])
    op.create_index('idx_invites_created_by', 'invites', ['created_by'])
    
    # Drop the problematic indexes (they seem to be duplicates)
    try:
        op.drop_index('idx_gallery_photos_approved', table_name='gallery_photos')
        op.drop_index('idx_gallery_photos_created_at', table_name='gallery_photos')
        op.drop_index('idx_gallery_photos_member_id', table_name='gallery_photos')
        op.drop_index('idx_gallery_photos_tree_id', table_name='gallery_photos')
        op.drop_index('idx_gallery_photos_uploaded_by', table_name='gallery_photos')
        op.drop_index('idx_global_notification_preferences_user_id', table_name='global_notification_preferences')
        op.drop_index('idx_notification_settings_tree_id', table_name='notification_settings')
        op.drop_index('idx_notification_settings_user_id', table_name='notification_settings')
    except:
        pass  # Indexes might not exist


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_invites_created_by', table_name='invites')
    op.drop_index('idx_invites_member_id', table_name='invites')
    
    # Drop foreign key constraints
    op.drop_constraint('fk_invites_created_by', 'invites', type_='foreignkey')
    op.drop_constraint('fk_invites_member_id', 'invites', type_='foreignkey')
    
    # Drop columns
    op.drop_column('invites', 'created_by')
    op.drop_column('invites', 'resend_count')
    op.drop_column('invites', 'member_id')
    
    # Recreate the indexes that were dropped
    try:
        op.create_index('idx_notification_settings_user_id', 'notification_settings', ['user_id'], unique=False)
        op.create_index('idx_notification_settings_tree_id', 'notification_settings', ['tree_id'], unique=False)
        op.create_index('idx_global_notification_preferences_user_id', 'global_notification_preferences', ['user_id'], unique=False)
        op.create_index('idx_gallery_photos_uploaded_by', 'gallery_photos', ['uploaded_by'], unique=False)
        op.create_index('idx_gallery_photos_tree_id', 'gallery_photos', ['tree_id'], unique=False)
        op.create_index('idx_gallery_photos_member_id', 'gallery_photos', ['member_id'], unique=False)
        op.create_index('idx_gallery_photos_created_at', 'gallery_photos', ['created_at'], unique=False)
        op.create_index('idx_gallery_photos_approved', 'gallery_photos', ['approved'], unique=False)
    except:
        pass  # Indexes might not exist
