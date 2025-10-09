"""add_unique_email_constraint_to_members

Revision ID: abab0ecbe152
Revises: e8ce069a8c8b
Create Date: 2025-10-08 16:12:38.495727

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'abab0ecbe152'
down_revision = 'e8ce069a8c8b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # First, we need to handle existing duplicate emails
    # This migration will merge duplicate members with the same email
    
    # Step 1: Find and merge duplicate members with same email
    connection = op.get_bind()
    
    # Find duplicate emails (excluding NULL emails)
    duplicate_emails = connection.execute(sa.text("""
        SELECT email, array_agg(id) as member_ids, count(*) as count
        FROM members 
        WHERE email IS NOT NULL AND email != ''
        GROUP BY email 
        HAVING count(*) > 1
    """)).fetchall()
    
    # For each duplicate email, keep the first member and merge others
    for row in duplicate_emails:
        email = row[0]
        member_ids = row[1]  # PostgreSQL array
        
        # Keep the first member, merge others into it
        primary_member_id = member_ids[0]
        duplicate_member_ids = member_ids[1:]
        
        print(f"Merging {len(duplicate_member_ids)} duplicate members for email {email}")
        
        # Update relationships to point to the primary member
        for duplicate_id in duplicate_member_ids:
            # Update relationships where this member is a_member
            connection.execute(sa.text("""
                UPDATE relationships 
                SET a_member_id = :primary_id 
                WHERE a_member_id = :duplicate_id
            """), {"primary_id": primary_member_id, "duplicate_id": duplicate_id})
            
            # Update relationships where this member is b_member
            connection.execute(sa.text("""
                UPDATE relationships 
                SET b_member_id = :primary_id 
                WHERE b_member_id = :duplicate_id
            """), {"primary_id": primary_member_id, "duplicate_id": duplicate_id})
            
            # Update invites that reference this member
            connection.execute(sa.text("""
                UPDATE invites 
                SET member_id = :primary_id 
                WHERE member_id = :duplicate_id
            """), {"primary_id": primary_member_id, "duplicate_id": duplicate_id})
            
            # Update gallery photos that reference this member
            connection.execute(sa.text("""
                UPDATE gallery_photos 
                SET member_id = :primary_id 
                WHERE member_id = :duplicate_id
            """), {"primary_id": primary_member_id, "duplicate_id": duplicate_id})
            
            # Update events that reference this member in member_ids JSON array
            connection.execute(sa.text("""
                UPDATE events 
                SET member_ids = (
                    SELECT jsonb_agg(
                        CASE 
                            WHEN value::text = :duplicate_id_str 
                            THEN :primary_id_str::jsonb
                            ELSE value 
                        END
                    )
                    FROM jsonb_array_elements(member_ids) AS value
                )
                WHERE member_ids ? :duplicate_id_str
            """), {
                "duplicate_id_str": f'"{duplicate_id}"',
                "primary_id_str": f'"{primary_member_id}"'
            })
            
            # Update photos that reference this member in member_ids JSON array
            connection.execute(sa.text("""
                UPDATE photos 
                SET member_ids = (
                    SELECT jsonb_agg(
                        CASE 
                            WHEN value::text = :duplicate_id_str 
                            THEN :primary_id_str::jsonb
                            ELSE value 
                        END
                    )
                    FROM jsonb_array_elements(member_ids) AS value
                )
                WHERE member_ids ? :duplicate_id_str
            """), {
                "duplicate_id_str": f'"{duplicate_id}"',
                "primary_id_str": f'"{primary_member_id}"'
            })
            
            # Delete the duplicate member
            connection.execute(sa.text("""
                DELETE FROM members WHERE id = :duplicate_id
            """), {"duplicate_id": duplicate_id})
            
            print(f"  Merged member {duplicate_id} into {primary_member_id}")
    
    # Step 2: Add unique constraint on email (excluding NULL values)
    # Create a partial unique index that only applies to non-null emails
    op.create_index(
        'ix_members_email_unique', 
        'members', 
        ['email'], 
        unique=True,
        postgresql_where=sa.text("email IS NOT NULL AND email != ''")
    )


def downgrade() -> None:
    # Remove the unique constraint
    op.drop_index('ix_members_email_unique', table_name='members')
