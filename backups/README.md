# Database Backup Scripts

This directory contains scripts for backing up and restoring PostgreSQL databases between local (bare metal) and production (Docker) environments.

## Quick Start

### Backup Local Database

```bash
./backup_local.fish
```

### Backup Docker Database

```bash
./backup_docker.fish
```

### Restore Local → Docker

```bash
./restore_to_docker.fish local_20241008_120000.dump
```

### Restore Docker → Local

```bash
./restore_to_local.fish prod_20241008_120000.dump
```

## Scripts

| Script                   | Description                  |
| ------------------------ | ---------------------------- |
| `backup_local.fish`      | Backup bare metal PostgreSQL |
| `backup_docker.fish`     | Backup Docker PostgreSQL     |
| `restore_to_docker.fish` | Restore backup to Docker     |
| `restore_to_local.fish`  | Restore backup to local      |

## Features

- ✅ Automatic compression
- ✅ Keeps last 10 backups
- ✅ Safety backup before restore
- ✅ Data verification after restore
- ✅ Alembic version checking
- ✅ Support for .dump, .sql, .sql.gz formats

## File Naming

- **Local backups**: `local_YYYYMMDD_HHMMSS.{dump,sql.gz}`
- **Docker backups**: `prod_YYYYMMDD_HHMMSS.{dump,sql.gz}`
- **Safety backups**: `safety_backup_YYYYMMDD_HHMMSS.dump`

## Make Scripts Executable

```bash
chmod +x *.fish
```

## Environment

Both environments use identical credentials:

- **User**: `postgres`
- **Password**: `!@Octopizzo808@!`
- **Port**: `5432`
- **Database**: `family_tree_dev`

## Full Documentation

See `apps/backend/docs/DATABASE_MIGRATION.md` for complete documentation.
