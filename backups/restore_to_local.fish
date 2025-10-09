#!/usr/bin/env fish
# Restore script: Docker → Local

if test (count $argv) -lt 1
    echo "Usage: ./restore_to_local.fish <backup_file>"
    echo ""
    echo "Examples:"
    echo "  ./restore_to_local.fish prod_20241008_120000.dump"
    echo "  ./restore_to_local.fish prod_20241008_120000.sql"
    echo "  ./restore_to_local.fish prod_20241008_120000.sql.gz"
    exit 1
end

set BACKUP_FILE $argv[1]
set DB_NAME "family_tree_dev"
set DB_USER "postgres"
set PGPASSWORD "!@Octopizzo808@!"

# Check if backup file exists
if not test -f $BACKUP_FILE
    echo "❌ Error: Backup file not found: $BACKUP_FILE"
    exit 1
end

echo "⚠️  WARNING: This will overwrite data in local PostgreSQL!"
echo "Database: $DB_NAME"
echo ""
read -P "Create safety backup first? (Y/n): " backup_confirm

if test "$backup_confirm" != "n" -a "$backup_confirm" != "N"
    set SAFETY_BACKUP "safety_backup_(date +%Y%m%d_%H%M%S).dump"
    echo "Creating safety backup: $SAFETY_BACKUP"
    env PGPASSWORD=$PGPASSWORD pg_dump -U $DB_USER -F c -f $SAFETY_BACKUP $DB_NAME
    echo "✅ Safety backup created: $SAFETY_BACKUP"
    echo ""
end

read -P "Continue with restore? (y/N): " confirm

if test "$confirm" != "y" -a "$confirm" != "Y"
    echo "Cancelled."
    exit 0
end

# Detect file type and restore accordingly
if string match -q "*.dump" $BACKUP_FILE
    echo "📦 Restoring custom format dump..."
    env PGPASSWORD=$PGPASSWORD pg_restore \
        -U $DB_USER \
        -d $DB_NAME \
        -c \
        --if-exists \
        $BACKUP_FILE
    
else if string match -q "*.sql.gz" $BACKUP_FILE
    echo "📄 Restoring compressed SQL dump..."
    gunzip -c $BACKUP_FILE | env PGPASSWORD=$PGPASSWORD psql -U $DB_USER $DB_NAME
    
else if string match -q "*.sql" $BACKUP_FILE
    echo "📄 Restoring SQL dump..."
    env PGPASSWORD=$PGPASSWORD psql -U $DB_USER $DB_NAME < $BACKUP_FILE
    
else
    echo "❌ Error: Unknown file type. Supported: .dump, .sql, .sql.gz"
    exit 1
end

if test $status -eq 0
    echo ""
    echo "✅ Restore completed successfully!"
    echo ""
    echo "🔍 Verifying data..."
    
    # Check row counts
    env PGPASSWORD=$PGPASSWORD psql -U $DB_USER $DB_NAME -c "
    SELECT 
      'users' as table_name, COUNT(*) as count FROM users
    UNION ALL
    SELECT 'trees', COUNT(*) FROM trees
    UNION ALL
    SELECT 'memberships', COUNT(*) FROM memberships
    UNION ALL
    SELECT 'members', COUNT(*) FROM members
    UNION ALL
    SELECT 'invites', COUNT(*) FROM invites;
    "
    
    # Check Alembic version
    echo ""
    echo "📋 Alembic version:"
    env PGPASSWORD=$PGPASSWORD psql -U $DB_USER $DB_NAME -c "SELECT version_num FROM alembic_version;"
    
else
    echo "❌ Restore failed!"
    exit 1
end
