#!/usr/bin/env fish
# Restore script: Local → Docker

if test (count $argv) -lt 1
    echo "Usage: ./restore_to_docker.fish <backup_file>"
    echo ""
    echo "Examples:"
    echo "  ./restore_to_docker.fish local_20241008_120000.dump"
    echo "  ./restore_to_docker.fish local_20241008_120000.sql"
    echo "  ./restore_to_docker.fish local_20241008_120000.sql.gz"
    exit 1
end

set BACKUP_FILE $argv[1]
set DB_NAME "family_tree_dev"
set DB_USER "postgres"
set CONTAINER_NAME "family_tree-postgres-1"

# Check if backup file exists
if not test -f $BACKUP_FILE
    echo "❌ Error: Backup file not found: $BACKUP_FILE"
    exit 1
end

# Check if container is running
if not docker ps --format '{{.Names}}' | grep -q $CONTAINER_NAME
    echo "❌ Error: Container $CONTAINER_NAME is not running"
    echo "Start it with: docker-compose up -d postgres"
    exit 1
end

echo "⚠️  WARNING: This will overwrite data in Docker PostgreSQL!"
echo "Database: $DB_NAME"
echo "Container: $CONTAINER_NAME"
echo ""
read -P "Continue? (y/N): " confirm

if test "$confirm" != "y" -a "$confirm" != "Y"
    echo "Cancelled."
    exit 0
end

# Detect file type and restore accordingly
if string match -q "*.dump" $BACKUP_FILE
    echo "📦 Restoring custom format dump..."
    
    # Copy dump to container
    docker cp $BACKUP_FILE "$CONTAINER_NAME:/tmp/restore.dump"
    
    # Restore
    docker exec $CONTAINER_NAME pg_restore \
        -U $DB_USER \
        -d $DB_NAME \
        -c \
        --if-exists \
        /tmp/restore.dump
    
    # Clean up
    docker exec $CONTAINER_NAME rm /tmp/restore.dump
    
else if string match -q "*.sql.gz" $BACKUP_FILE
    echo "📄 Restoring compressed SQL dump..."
    gunzip -c $BACKUP_FILE | docker exec -i $CONTAINER_NAME psql -U $DB_USER $DB_NAME
    
else if string match -q "*.sql" $BACKUP_FILE
    echo "📄 Restoring SQL dump..."
    cat $BACKUP_FILE | docker exec -i $CONTAINER_NAME psql -U $DB_USER $DB_NAME
    
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
    docker exec $CONTAINER_NAME psql -U $DB_USER $DB_NAME -c "
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
    docker exec $CONTAINER_NAME psql -U $DB_USER $DB_NAME -c "SELECT version_num FROM alembic_version;"
    
else
    echo "❌ Restore failed!"
    exit 1
end
