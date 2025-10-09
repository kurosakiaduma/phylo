#!/usr/bin/env fish
# Backup script for Docker PostgreSQL database

set BACKUP_DIR "/mnt/win3/work/family_tree/backups"
set TIMESTAMP (date +%Y%m%d_%H%M%S)
set DB_NAME "family_tree_dev"
set DB_USER "postgres"
set CONTAINER_NAME "family_tree-postgres-1"

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Check if container is running
if not docker ps --format '{{.Names}}' | grep -q $CONTAINER_NAME
    echo "❌ Error: Container $CONTAINER_NAME is not running"
    echo "Start it with: docker-compose up -d postgres"
    exit 1
end

# Create custom format dump (compressed)
echo "Creating backup: prod_$TIMESTAMP.dump"
docker exec $CONTAINER_NAME pg_dump -U $DB_USER -F c $DB_NAME > "$BACKUP_DIR/prod_$TIMESTAMP.dump"

if test $status -eq 0
    echo "✅ Custom format backup created successfully"
else
    echo "❌ Custom format backup failed"
    exit 1
end

# Create SQL backup (for easy inspection)
echo "Creating SQL backup: prod_$TIMESTAMP.sql"
docker exec $CONTAINER_NAME pg_dump -U $DB_USER -F p $DB_NAME > "$BACKUP_DIR/prod_$TIMESTAMP.sql"

if test $status -eq 0
    echo "✅ SQL backup created successfully"
else
    echo "❌ SQL backup failed"
    exit 1
end

# Compress SQL file
echo "Compressing SQL backup..."
gzip "$BACKUP_DIR/prod_$TIMESTAMP.sql"

# Keep only last 10 backups of each type
cd $BACKUP_DIR
set dump_files (ls -t prod_*.dump 2>/dev/null)
if test (count $dump_files) -gt 10
    for file in $dump_files[11..-1]
        echo "Removing old backup: $file"
        rm $file
    end
end

set sql_files (ls -t prod_*.sql.gz 2>/dev/null)
if test (count $sql_files) -gt 10
    for file in $sql_files[11..-1]
        echo "Removing old backup: $file"
        rm $file
    end
end

echo ""
echo "🎉 Backup complete!"
echo "📁 Location: $BACKUP_DIR"
echo "📊 Files:"
ls -lh "$BACKUP_DIR/prod_$TIMESTAMP"*
