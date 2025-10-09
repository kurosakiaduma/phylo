#!/usr/bin/env fish
# Backup script for local bare metal PostgreSQL database

set BACKUP_DIR "/mnt/win3/work/family_tree/backups"
set TIMESTAMP (date +%Y%m%d_%H%M%S)
set DB_NAME "family_tree_dev"
set DB_USER "postgres"
set PGPASSWORD "!@Octopizzo808@!"

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Create custom format dump (compressed)
echo "Creating backup: local_$TIMESTAMP.dump"
env PGPASSWORD=$PGPASSWORD pg_dump -U $DB_USER -F c -f "$BACKUP_DIR/local_$TIMESTAMP.dump" $DB_NAME

if test $status -eq 0
    echo "✅ Custom format backup created successfully"
else
    echo "❌ Custom format backup failed"
    exit 1
end

# Create SQL backup (for easy inspection)
echo "Creating SQL backup: local_$TIMESTAMP.sql"
env PGPASSWORD=$PGPASSWORD pg_dump -U $DB_USER -F p -f "$BACKUP_DIR/local_$TIMESTAMP.sql" $DB_NAME

if test $status -eq 0
    echo "✅ SQL backup created successfully"
else
    echo "❌ SQL backup failed"
    exit 1
end

# Compress SQL file
echo "Compressing SQL backup..."
gzip "$BACKUP_DIR/local_$TIMESTAMP.sql"

# Keep only last 10 backups of each type
cd $BACKUP_DIR
set dump_files (ls -t local_*.dump 2>/dev/null)
if test (count $dump_files) -gt 10
    for file in $dump_files[11..-1]
        echo "Removing old backup: $file"
        rm $file
    end
end

set sql_files (ls -t local_*.sql.gz 2>/dev/null)
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
ls -lh "$BACKUP_DIR/local_$TIMESTAMP"*
