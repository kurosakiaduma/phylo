"""enhance user and member models with demographics, events, and gallery

Revision ID: 20251002_095000
Revises: 20251002_084218
Create Date: 2025-10-02 09:50:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON, UUID


# revision identifiers, used by Alembic.
revision = '20251002_095000'
down_revision = '20251002_084218'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add comprehensive demographic fields, events, and gallery support."""
    
    # Enhance users table
    op.add_column('users', sa.Column('dob', sa.String(), nullable=True))
    op.add_column('users', sa.Column('gender', sa.String(), nullable=True))
    op.add_column('users', sa.Column('pronouns', sa.String(), nullable=True))
    op.add_column('users', sa.Column('bio', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('phone', sa.String(), nullable=True))
    op.add_column('users', sa.Column('location', sa.String(), nullable=True))
    op.add_column('users', sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=True))
    
    # Enhance members table
    op.add_column('members', sa.Column('avatar_url', sa.String(), nullable=True))
    op.add_column('members', sa.Column('dod', sa.String(), nullable=True))
    op.add_column('members', sa.Column('pronouns', sa.String(), nullable=True))
    op.add_column('members', sa.Column('birth_place', sa.String(), nullable=True))
    op.add_column('members', sa.Column('death_place', sa.String(), nullable=True))
    op.add_column('members', sa.Column('occupation', sa.String(), nullable=True))
    op.add_column('members', sa.Column('bio', sa.Text(), nullable=True))
    
    # Alter dob in members to be nullable (if not already)
    op.alter_column('members', 'dob', nullable=True, existing_type=sa.String())
    
    # Alter gender in members to be nullable (if not already)
    op.alter_column('members', 'gender', nullable=True, existing_type=sa.String())
    
    # Create events table
    op.create_table(
        'events',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('tree_id', UUID(as_uuid=True), sa.ForeignKey('trees.id'), nullable=False, index=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('event_type', sa.String(), nullable=False, index=True),
        sa.Column('event_date', sa.String(), nullable=False),
        sa.Column('end_date', sa.String(), nullable=True),
        sa.Column('location', sa.String(), nullable=True),
        sa.Column('member_ids', JSON, nullable=True),
        sa.Column('is_recurring', sa.Boolean(), default=False),
        sa.Column('recurrence_rule', sa.String(), nullable=True),
        sa.Column('is_public', sa.Boolean(), default=True),
        sa.Column('created_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Create indexes for events
    op.create_index('ix_events_tree_date', 'events', ['tree_id', 'event_date'])
    op.create_index('ix_events_tree_type', 'events', ['tree_id', 'event_type'])
    
    # Create photos table
    op.create_table(
        'photos',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('tree_id', UUID(as_uuid=True), sa.ForeignKey('trees.id'), nullable=False, index=True),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('photo_url', sa.String(), nullable=False),
        sa.Column('thumbnail_url', sa.String(), nullable=True),
        sa.Column('taken_date', sa.String(), nullable=True),
        sa.Column('location', sa.String(), nullable=True),
        sa.Column('member_ids', JSON, nullable=True),
        sa.Column('event_id', UUID(as_uuid=True), sa.ForeignKey('events.id'), nullable=True, index=True),
        sa.Column('is_family_photo', sa.Boolean(), default=False),
        sa.Column('is_public', sa.Boolean(), default=True),
        sa.Column('uploaded_by', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    
    # Create indexes for photos
    op.create_index('ix_photos_tree_date', 'photos', ['tree_id', 'taken_date'])
    op.create_index('ix_photos_tree_family', 'photos', ['tree_id', 'is_family_photo'])


def downgrade() -> None:
    """Remove demographics, events, and gallery enhancements."""
    
    # Drop photos table and indexes
    op.drop_index('ix_photos_tree_family', table_name='photos')
    op.drop_index('ix_photos_tree_date', table_name='photos')
    op.drop_table('photos')
    
    # Drop events table and indexes
    op.drop_index('ix_events_tree_type', table_name='events')
    op.drop_index('ix_events_tree_date', table_name='events')
    op.drop_table('events')
    
    # Remove members table columns
    op.drop_column('members', 'bio')
    op.drop_column('members', 'occupation')
    op.drop_column('members', 'death_place')
    op.drop_column('members', 'birth_place')
    op.drop_column('members', 'pronouns')
    op.drop_column('members', 'dod')
    op.drop_column('members', 'avatar_url')
    
    # Remove users table columns
    op.drop_column('users', 'updated_at')
    op.drop_column('users', 'location')
    op.drop_column('users', 'phone')
    op.drop_column('users', 'bio')
    op.drop_column('users', 'pronouns')
    op.drop_column('users', 'gender')
    op.drop_column('users', 'dob')
