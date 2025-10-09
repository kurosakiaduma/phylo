# Database Migration Guide: Local ↔ Production

## Overview

This guide covers database dump/restore operations between:

- **Local Environment**: Bare metal PostgreSQL 17.6
- **Production Environment**: Docker PostgreSQL 17 (docker-compose)

Both environments use **identical credentials** for seamless migration:

- **User**: `postgres`
- **Password**: `!@Octopizzo808@!`
- **Port**: `5432`
- **Database**: `family_tree_dev`

---

## Environment Setup

### Local (Bare Metal PostgreSQL)

```bash
# PostgreSQL is installed directly on the system
psql --version
# PostgreSQL 17.6

# Connection details in .env
DATABASE_URL=postgresql://postgres:%21%40Octopizzo808%40%21@localhost:5432/family_tree_dev
```

### Production (Docker PostgreSQL)

```bash
# Start PostgreSQL via docker-compose
docker-compose up -d postgres

# Verify container is running
docker-compose ps postgres

# Connection details (same as local)
DATABASE_URL=postgresql://postgres:%21%40Octopizzo808%40%21@localhost:5432/family_tree_dev
```

---

## Quick Reference

### Common Commands

```bash
# Dump local database
pg_dump -U postgres family_tree_dev > backup.sql

# Restore to Docker PostgreSQL
docker exec -i family_tree-postgres-1 psql -U postgres family_tree_dev < backup.sql

# Dump Docker PostgreSQL
docker exec family_tree-postgres-1 pg_dump -U postgres family_tree_dev > backup.sql

# Restore to local database
psql -U postgres family_tree_dev < backup.sql
```

---

## Detailed Procedures

### 1. Export from Local (Bare Metal) → Production (Docker)

#### Step 1: Create Dump from Local Database

```bash
# Navigate to a safe directory
cd /mnt/win3/work/family_tree/backups

# Create full database dump
pg_dump -U postgres \
  -F c \
  -f "local_$(date +%Y%m%d_%H%M%S).dump" \
  family_tree_dev

# Or as SQL file (more readable)
pg_dump -U postgres \
  -F p \
  -f "local_$(date +%Y%m%d_%H%M%S).sql" \
  family_tree_dev

# Enter password when prompted: !@Octopizzo808@!
```

**Options explained:**

- `-F c`: Custom format (compressed, recommended for large DBs)
- `-F p`: Plain SQL format (human-readable)
- `-f`: Output file

#### Step 2: Verify Docker PostgreSQL is Running

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Wait for health check to pass
docker-compose ps postgres
# Should show "healthy" status

# Test connection
docker exec family_tree-postgres-1 psql -U postgres -c "SELECT version();"
```

#### Step 3: Restore to Docker PostgreSQL

**Option A: Custom Format (.dump)**

```bash
# Copy dump file into container
docker cp local_20241008_120000.dump family_tree-postgres-1:/tmp/

# Restore using pg_restore
docker exec family_tree-postgres-1 pg_restore \
  -U postgres \
  -d family_tree_dev \
  -c \
  --if-exists \
  /tmp/local_20241008_120000.dump

# Clean up
docker exec family_tree-postgres-1 rm /tmp/local_20241008_120000.dump
```

**Option B: SQL Format (.sql) - Recommended for Simplicity**

```bash
# Direct restore via stdin (no copy needed)
cat local_20241008_120000.sql | \
  docker exec -i family_tree-postgres-1 psql -U postgres family_tree_dev
```

**Options explained:**

- `-c`: Clean (drop) database objects before recreating
- `--if-exists`: Don't error if objects don't exist
- `-i`: Interactive mode for stdin

#### Step 4: Verify Data

```bash
# Check tables exist
docker exec family_tree-postgres-1 psql -U postgres family_tree_dev -c "\dt"

# Check row counts
docker exec family_tree-postgres-1 psql -U postgres family_tree_dev -c "
SELECT
  'users' as table_name, COUNT(*) FROM users
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
docker exec family_tree-postgres-1 psql -U postgres family_tree_dev -c "
SELECT version_num FROM alembic_version;
"
```

---

### 2. Export from Production (Docker) → Local (Bare Metal)

#### Step 1: Create Dump from Docker PostgreSQL

```bash
# Navigate to backups directory
cd /mnt/win3/work/family_tree/backups

# Dump from Docker container (custom format)
docker exec family_tree-postgres-1 pg_dump \
  -U postgres \
  -F c \
  family_tree_dev > "prod_$(date +%Y%m%d_%H%M%S).dump"

# Or SQL format
docker exec family_tree-postgres-1 pg_dump \
  -U postgres \
  -F p \
  family_tree_dev > "prod_$(date +%Y%m%d_%H%M%S).sql"
```

#### Step 2: Backup Current Local Database (Safety)

```bash
# Always backup before restoring
pg_dump -U postgres \
  -F c \
  -f "local_backup_$(date +%Y%m%d_%H%M%S).dump" \
  family_tree_dev
```

#### Step 3: Restore to Local Database

**Option A: Drop and Recreate (Clean Slate)**

```bash
# Drop and recreate database
dropdb -U postgres family_tree_dev
createdb -U postgres family_tree_dev

# Restore from dump
pg_restore -U postgres \
  -d family_tree_dev \
  prod_20241008_120000.dump

# Or from SQL file
psql -U postgres family_tree_dev < prod_20241008_120000.sql
```

**Option B: Clean and Restore (Keep Database)**

```bash
# Restore with clean option
pg_restore -U postgres \
  -d family_tree_dev \
  -c \
  --if-exists \
  prod_20241008_120000.dump
```

#### Step 4: Verify Data

```bash
# Check tables
psql -U postgres family_tree_dev -c "\dt"

# Check row counts
psql -U postgres family_tree_dev -c "
SELECT
  'users' as table_name, COUNT(*) FROM users
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
psql -U postgres family_tree_dev -c "SELECT version_num FROM alembic_version;"
```

---

## Alembic Migration Management

### Running Alembic Against Docker PostgreSQL

When using Docker PostgreSQL in production, Alembic works the same way:

```bash
# Update .env to point to Docker PostgreSQL (same URL works!)
DATABASE_URL=postgresql://postgres:%21%40Octopizzo808%40%21@localhost:5432/family_tree_dev

# Run migrations
cd apps/backend
alembic upgrade head

# Check current version
alembic current

# Show migration history
alembic history

# Create new migration
alembic revision -m "description"
```

**Important:** Alembic connects via `localhost:5432` whether PostgreSQL is:

- Running on bare metal (local dev)
- Running in Docker (production)

### Syncing Migrations Between Environments

```bash
# After restoring a dump, verify Alembic state
psql -U postgres family_tree_dev -c "SELECT * FROM alembic_version;"

# If migrations are out of sync:
# 1. Reset alembic_version (use tools/reset_alembic.py)
python tools/reset_alembic.py

# 2. Run migrations to catch up
alembic upgrade head

# 3. Verify
alembic current
```

---

## Automated Backup Scripts

### Create Backup Script

Create `backups/backup_local.sh`:

```bash
#!/bin/bash
set -e

BACKUP_DIR="/mnt/win3/work/family_tree/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="family_tree_dev"
DB_USER="postgres"

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Create dump
echo "Creating backup: local_$TIMESTAMP.dump"
pg_dump -U $DB_USER -F c -f "$BACKUP_DIR/local_$TIMESTAMP.dump" $DB_NAME

# Create SQL backup (for easy inspection)
echo "Creating SQL backup: local_$TIMESTAMP.sql"
pg_dump -U $DB_USER -F p -f "$BACKUP_DIR/local_$TIMESTAMP.sql" $DB_NAME

# Compress SQL file
gzip "$BACKUP_DIR/local_$TIMESTAMP.sql"

# Keep only last 10 backups
cd "$BACKUP_DIR"
ls -t local_*.dump | tail -n +11 | xargs -r rm
ls -t local_*.sql.gz | tail -n +11 | xargs -r rm

echo "Backup complete!"
```

Make executable:

```bash
chmod +x backups/backup_local.sh
```

### Create Docker Backup Script

Create `backups/backup_docker.sh`:

```bash
#!/bin/bash
set -e

BACKUP_DIR="/mnt/win3/work/family_tree/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="family_tree_dev"
DB_USER="postgres"
CONTAINER_NAME="family_tree-postgres-1"

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Create dump from Docker container
echo "Creating backup: prod_$TIMESTAMP.dump"
docker exec $CONTAINER_NAME pg_dump -U $DB_USER -F c $DB_NAME > "$BACKUP_DIR/prod_$TIMESTAMP.dump"

# Create SQL backup
echo "Creating SQL backup: prod_$TIMESTAMP.sql"
docker exec $CONTAINER_NAME pg_dump -U $DB_USER -F p $DB_NAME > "$BACKUP_DIR/prod_$TIMESTAMP.sql"

# Compress SQL file
gzip "$BACKUP_DIR/prod_$TIMESTAMP.sql"

# Keep only last 10 backups
cd "$BACKUP_DIR"
ls -t prod_*.dump | tail -n +11 | xargs -r rm
ls -t prod_*.sql.gz | tail -n +11 | xargs -r rm

echo "Backup complete!"
```

Make executable:

```bash
chmod +x backups/backup_docker.sh
```

### Usage

```bash
# Backup local database
./backups/backup_local.sh

# Backup Docker database
./backups/backup_docker.sh

# Schedule daily backups (crontab)
crontab -e
# Add:
# 0 2 * * * /mnt/win3/work/family_tree/backups/backup_local.sh
# 0 3 * * * /mnt/win3/work/family_tree/backups/backup_docker.sh
```

---

## Data-Only Dumps (Excluding Schema)

Sometimes you want to transfer just the data without schema changes:

### Export Data Only

```bash
# From local
pg_dump -U postgres \
  -a \
  --column-inserts \
  -f data_only.sql \
  family_tree_dev

# From Docker
docker exec family_tree-postgres-1 pg_dump \
  -U postgres \
  -a \
  --column-inserts \
  family_tree_dev > data_only.sql
```

**Options:**

- `-a`: Data only (no schema)
- `--column-inserts`: Use INSERT with column names (more portable)

### Import Data Only

```bash
# To local
psql -U postgres family_tree_dev < data_only.sql

# To Docker
cat data_only.sql | docker exec -i family_tree-postgres-1 psql -U postgres family_tree_dev
```

---

## Specific Table Dumps

### Export Specific Tables

```bash
# Dump only users and trees tables
pg_dump -U postgres \
  -t users \
  -t trees \
  -f users_trees.sql \
  family_tree_dev

# From Docker
docker exec family_tree-postgres-1 pg_dump \
  -U postgres \
  -t users \
  -t trees \
  family_tree_dev > users_trees.sql
```

### Exclude Specific Tables

```bash
# Dump everything except invites table
pg_dump -U postgres \
  -T invites \
  -f without_invites.sql \
  family_tree_dev
```

---

## Troubleshooting

### Issue: Password Authentication Failed

**Problem:** Can't connect to database after restore

**Solution:**

```bash
# Verify password in .env
cat apps/backend/.env | grep DATABASE_URL

# Should be: postgresql://postgres:%21%40Octopizzo808%40%21@localhost:5432/family_tree_dev

# Test connection
psql "postgresql://postgres:!@Octopizzo808@!@localhost:5432/family_tree_dev" -c "SELECT 1;"

# For Docker
docker exec family_tree-postgres-1 psql -U postgres -c "SELECT 1;"
```

### Issue: Tables Don't Exist After Restore

**Problem:** Restore completed but tables missing

**Solution:**

```bash
# Check if restore actually worked
psql -U postgres family_tree_dev -c "\dt"

# If empty, try restoring again with verbose mode
pg_restore -U postgres -d family_tree_dev -v backup.dump

# Check for errors in output
```

### Issue: Alembic Version Mismatch

**Problem:** Alembic thinks migrations are out of sync

**Solution:**

```bash
# Check current Alembic version in database
psql -U postgres family_tree_dev -c "SELECT * FROM alembic_version;"

# Check migrations in code
alembic history

# Reset and rerun if needed
python tools/reset_alembic.py
alembic upgrade head
```

### Issue: Docker Container Won't Start

**Problem:** PostgreSQL container keeps restarting

**Solution:**

```bash
# Check logs
docker-compose logs postgres

# Check if port 5432 is already in use
sudo lsof -i :5432

# If local PostgreSQL is running, stop it temporarily
sudo systemctl stop postgresql

# Or change Docker port in docker-compose.yml
# ports:
#   - '5433:5432'  # Map to different host port
```

### Issue: Dump File Too Large

**Problem:** Dump file is huge and slow to transfer

**Solution:**

```bash
# Use custom format (automatically compressed)
pg_dump -U postgres -F c -f backup.dump family_tree_dev

# Or compress SQL dump
pg_dump -U postgres family_tree_dev | gzip > backup.sql.gz

# Restore compressed dump
gunzip -c backup.sql.gz | psql -U postgres family_tree_dev
```

---

## Best Practices

### Before Restoring

1. **Always backup current database first**

   ```bash
   pg_dump -U postgres -F c -f safety_backup.dump family_tree_dev
   ```

2. **Verify dump file integrity**

   ```bash
   # For custom format
   pg_restore -l backup.dump | head -20

   # For SQL format
   head -100 backup.sql
   ```

3. **Test restore on a copy first** (if critical)
   ```bash
   createdb -U postgres family_tree_test
   pg_restore -U postgres -d family_tree_test backup.dump
   ```

### After Restoring

1. **Verify row counts match**

   ```sql
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM trees;
   SELECT COUNT(*) FROM memberships;
   ```

2. **Check Alembic version**

   ```bash
   alembic current
   ```

3. **Run a test query**
   ```sql
   SELECT u.email, t.name
   FROM users u
   JOIN memberships m ON u.id = m.user_id
   JOIN trees t ON m.tree_id = t.id
   LIMIT 5;
   ```

### Backup Retention

- **Local dev**: Keep last 10 backups
- **Production**: Keep daily for 30 days, weekly for 3 months
- **Critical data**: Store off-site (S3, Backblaze, etc.)

---

## Summary

### Quick Commands

```bash
# Local → Docker
pg_dump -U postgres family_tree_dev > backup.sql
cat backup.sql | docker exec -i family_tree-postgres-1 psql -U postgres family_tree_dev

# Docker → Local
docker exec family_tree-postgres-1 pg_dump -U postgres family_tree_dev > backup.sql
psql -U postgres family_tree_dev < backup.sql

# Run Alembic (works for both)
alembic upgrade head

# Verify connection (both use same port/credentials)
psql "postgresql://postgres:!@Octopizzo808@!@localhost:5432/family_tree_dev" -c "SELECT 1;"
```

### Key Points

- ✅ Same credentials on both environments
- ✅ Same port (5432) on both environments
- ✅ Alembic works identically on both
- ✅ Easy dump/restore between environments
- ✅ Always backup before restoring
- ✅ Verify data after restore

---

For questions or issues, refer to the troubleshooting section or check database logs.
