# Backup and Restore Procedures

## Overview

This document outlines the backup and restore procedures for AutoDocs AI. All critical data is stored in PostgreSQL, and proper backup procedures ensure business continuity and disaster recovery.

## Critical Data Components

### 1. PostgreSQL Database
- **users** - User accounts and authentication data
- **repositories** - Repository metadata and sync status
- **documents** - Generated documentation content
- **analysis_jobs** - Job history and status
- **chat_messages** - Chat interaction history
- **webhooks** - Webhook configurations
- **schema_migrations** - Migration history

### 2. Configuration Files (Not in Backups)
- `.env` files - Must be stored separately (secrets manager)
- API keys - Stored in environment variables

### 3. External Services (Separate Backups)
- **Pinecone** - Vector embeddings (has its own backup mechanisms)
- **GitHub** - Source code (externally hosted)

## Automated Backup Configuration

### PostgreSQL Automated Backups

#### Using pg_dump (Recommended for Development/Staging)

Create a backup script at `backend/scripts/backup.sh`:

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/var/backups/autodocs"
DATABASE_NAME="${DATABASE_NAME:-autodocs_dev}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/autodocs_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup
echo "Starting backup of $DATABASE_NAME at $(date)"
pg_dump "$DATABASE_NAME" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "Backup successful: $BACKUP_FILE"
    echo "Backup size: $(du -h $BACKUP_FILE | cut -f1)"

    # Remove backups older than retention period
    find "$BACKUP_DIR" -name "autodocs_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    echo "Cleaned up backups older than $RETENTION_DAYS days"
else
    echo "Backup failed!"
    exit 1
fi
```

#### Setting Up Automated Backups with Cron

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backend/scripts/backup.sh >> /var/log/autodocs-backup.log 2>&1

# Add hourly backup (for production)
0 * * * * /path/to/backend/scripts/backup.sh >> /var/log/autodocs-backup.log 2>&1
```

### Cloud Provider Backups

#### Railway (Production Backend)

Railway provides automated backups:
- **Frequency**: Daily snapshots
- **Retention**: 7 days (free tier), 30 days (paid)
- **Location**: Same region as database
- **Recovery**: One-click restore from dashboard

**To enable:**
1. Go to Railway dashboard
2. Select your PostgreSQL service
3. Navigate to "Backups" tab
4. Enable automated backups
5. Configure retention period

#### Vercel (Frontend - No Database)

Vercel deployments are stateless and use Git for version control:
- **Source Code**: Backed up in GitHub repository
- **Environment Variables**: Export and store securely
- **Build Cache**: Automatically managed

### AWS RDS (Alternative Production Setup)

If using AWS RDS for PostgreSQL:

```bash
# Automated backup configuration
- Backup window: 02:00-03:00 UTC
- Backup retention: 30 days
- Point-in-time recovery: Enabled
- Cross-region backup: Optional (recommended for DR)
```

## Manual Backup Procedures

### Full Database Backup

```bash
# Basic backup
pg_dump autodocs_dev > backup_$(date +%Y%m%d).sql

# Compressed backup (recommended)
pg_dump autodocs_dev | gzip > backup_$(date +%Y%m%d).sql.gz

# Include all databases (if multiple)
pg_dumpall | gzip > full_backup_$(date +%Y%m%d).sql.gz

# Backup to remote location
pg_dump autodocs_dev | gzip | aws s3 cp - s3://autodocs-backups/backup_$(date +%Y%m%d).sql.gz
```

### Schema-Only Backup

```bash
# Useful for testing migrations
pg_dump --schema-only autodocs_dev > schema_$(date +%Y%m%d).sql
```

### Data-Only Backup

```bash
# Backup data without schema
pg_dump --data-only autodocs_dev > data_$(date +%Y%m%d).sql
```

### Specific Table Backup

```bash
# Backup single table
pg_dump -t users autodocs_dev > users_backup.sql

# Backup multiple tables
pg_dump -t users -t repositories autodocs_dev > critical_tables_backup.sql
```

## Restore Procedures

### Full Database Restore

```bash
# Step 1: Create new database (if needed)
createdb autodocs_restored

# Step 2: Restore from backup
gunzip -c backup_20241224.sql.gz | psql autodocs_restored

# Or without compression
psql autodocs_restored < backup_20241224.sql

# Step 3: Verify restoration
psql autodocs_restored -c "\dt"  # List tables
psql autodocs_restored -c "SELECT COUNT(*) FROM users;"  # Check data
```

### Restore to Existing Database (Overwrite)

```bash
# WARNING: This will drop the existing database!

# Step 1: Drop existing database
dropdb autodocs_dev

# Step 2: Recreate database
createdb autodocs_dev

# Step 3: Restore backup
gunzip -c backup_20241224.sql.gz | psql autodocs_dev

# Step 4: Run any pending migrations
cd backend && npm run migrate
```

### Point-in-Time Recovery (Production)

For production databases with continuous archiving:

```bash
# Restore to specific timestamp
pg_restore --dbname=autodocs_prod \
  --clean \
  --if-exists \
  backup_file.dump \
  --target-time="2024-12-24 14:30:00"
```

### Partial Restore (Specific Tables)

```bash
# Restore specific table
pg_restore --dbname=autodocs_dev \
  --table=users \
  backup_file.dump

# Or from SQL file
gunzip -c backup.sql.gz | grep -A10000 "CREATE TABLE users" | psql autodocs_dev
```

## Backup Validation

### Automated Validation Script

Create `backend/scripts/validate-backup.sh`:

```bash
#!/bin/bash

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    exit 1
fi

# Create temporary database
TEMP_DB="autodocs_validate_$(date +%s)"
createdb "$TEMP_DB"

# Restore to temporary database
echo "Restoring backup to temporary database..."
gunzip -c "$BACKUP_FILE" | psql "$TEMP_DB" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    # Validate schema
    TABLE_COUNT=$(psql -t "$TEMP_DB" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';")
    USER_COUNT=$(psql -t "$TEMP_DB" -c "SELECT COUNT(*) FROM users;")

    echo "✅ Backup validation successful!"
    echo "   Tables: $TABLE_COUNT"
    echo "   Users: $USER_COUNT"

    # Cleanup
    dropdb "$TEMP_DB"
    exit 0
else
    echo "❌ Backup validation failed!"
    dropdb "$TEMP_DB" 2>/dev/null
    exit 1
fi
```

### Manual Validation

```bash
# 1. Check backup file integrity
gunzip -t backup_20241224.sql.gz

# 2. Check backup size (should be reasonable)
du -h backup_20241224.sql.gz

# 3. Peek at backup contents
gunzip -c backup_20241224.sql.gz | head -50

# 4. Verify table count
gunzip -c backup_20241224.sql.gz | grep "CREATE TABLE" | wc -l
```

## Backup Frequency Guidelines

### Development Environment
- **Frequency**: Daily (or before major changes)
- **Retention**: 7 days
- **Storage**: Local filesystem

### Staging Environment
- **Frequency**: Every 6 hours
- **Retention**: 14 days
- **Storage**: Cloud storage (S3, GCS, etc.)

### Production Environment
- **Frequency**:
  - Continuous WAL archiving (PostgreSQL)
  - Full backup every 6 hours
  - Incremental backups hourly
- **Retention**:
  - 30 days full backups
  - 90 days monthly snapshots
  - 1 year annual snapshots
- **Storage**:
  - Primary: Same region as database
  - Secondary: Cross-region replication
  - Archive: Glacier/Cold storage for annual backups

## Disaster Recovery Plan

### RTO (Recovery Time Objective)
- **Development**: 4 hours
- **Staging**: 2 hours
- **Production**: 30 minutes

### RPO (Recovery Point Objective)
- **Development**: 24 hours (daily backups)
- **Staging**: 6 hours
- **Production**: 5 minutes (continuous archiving)

### Recovery Steps

1. **Assess Impact**
   - Identify what data was lost
   - Determine last known good backup
   - Notify stakeholders

2. **Provision Infrastructure**
   ```bash
   # Create new database instance
   createdb autodocs_recovery
   ```

3. **Restore Data**
   ```bash
   # Restore from latest backup
   gunzip -c latest_backup.sql.gz | psql autodocs_recovery
   ```

4. **Validate Data**
   ```bash
   # Run validation queries
   psql autodocs_recovery -c "SELECT COUNT(*) FROM users;"
   psql autodocs_recovery -c "SELECT COUNT(*) FROM repositories;"
   psql autodocs_recovery -c "SELECT COUNT(*) FROM documents;"
   ```

5. **Update Configuration**
   ```bash
   # Update DATABASE_URL in .env
   DATABASE_URL=postgresql://localhost/autodocs_recovery
   ```

6. **Restart Services**
   ```bash
   # Restart backend
   cd backend && npm restart

   # Verify health
   curl http://localhost:3001/health
   ```

7. **Monitor**
   - Check application logs
   - Monitor error rates
   - Verify user functionality

## Backup Storage

### Storage Locations

#### Local Development
```bash
/var/backups/autodocs/
├── autodocs_20241224_020000.sql.gz
├── autodocs_20241223_020000.sql.gz
└── autodocs_20241222_020000.sql.gz
```

#### Cloud Storage (Production)

**AWS S3:**
```bash
s3://autodocs-backups/
├── production/
│   ├── 2024/12/24/
│   │   ├── autodocs_20241224_020000.sql.gz
│   │   └── autodocs_20241224_080000.sql.gz
│   └── monthly/
│       └── autodocs_202412_snapshot.sql.gz
└── staging/
    └── 2024/12/24/
        └── autodocs_staging_20241224_020000.sql.gz
```

**Google Cloud Storage:**
```bash
gs://autodocs-backups/
├── production/
└── staging/
```

### Backup Encryption

Always encrypt backups containing sensitive data:

```bash
# Encrypt backup
pg_dump autodocs_prod | gzip | \
  openssl enc -aes-256-cbc -salt -pbkdf2 \
  -out backup_$(date +%Y%m%d).sql.gz.enc

# Decrypt and restore
openssl enc -d -aes-256-cbc -pbkdf2 \
  -in backup_20241224.sql.gz.enc | \
  gunzip | psql autodocs_restored
```

## Testing Restore Procedures

### Monthly Restore Test

Perform a full restore test monthly:

```bash
#!/bin/bash
# Monthly restore test script

echo "=== Monthly Backup Restore Test ==="
echo "Date: $(date)"

# 1. Select random backup from last week
BACKUP=$(ls -1 /var/backups/autodocs/*.sql.gz | shuf -n 1)
echo "Testing backup: $BACKUP"

# 2. Create test database
TEST_DB="autodocs_test_$(date +%s)"
createdb "$TEST_DB"

# 3. Restore backup
gunzip -c "$BACKUP" | psql "$TEST_DB" > /tmp/restore_test.log 2>&1

# 4. Run validation queries
USERS=$(psql -t "$TEST_DB" -c "SELECT COUNT(*) FROM users;")
REPOS=$(psql -t "$TEST_DB" -c "SELECT COUNT(*) FROM repositories;")

echo "Restored data:"
echo "  Users: $USERS"
echo "  Repositories: $REPOS"

# 5. Cleanup
dropdb "$TEST_DB"

echo "✅ Monthly restore test completed successfully"
```

### Quarterly Disaster Recovery Drill

Full DR simulation:
1. Backup production database
2. Provision new infrastructure
3. Restore from backup
4. Validate all services
5. Document time taken
6. Update procedures based on findings

## Monitoring and Alerts

### Backup Monitoring

Monitor backup success/failure:

```bash
# Check last backup time
ls -lht /var/backups/autodocs/*.sql.gz | head -1

# Alert if no backup in 24 hours
LAST_BACKUP=$(find /var/backups/autodocs -name "*.sql.gz" -mtime -1 | wc -l)
if [ $LAST_BACKUP -eq 0 ]; then
    echo "⚠️  No backup in last 24 hours!"
    # Send alert
fi
```

### Backup Size Monitoring

```bash
# Track backup size trends
du -h /var/backups/autodocs/*.sql.gz | sort -h

# Alert on significant size changes (>20% difference)
```

### Automated Alerts

Set up alerts for:
- ❌ Backup failures
- ⚠️  Backup size anomalies
- ⚠️  Storage space running low
- ✅ Successful restores (testing)

## Security Considerations

### Access Control

- Backups should be readable only by authorized users
- Use separate credentials for backup operations
- Implement least-privilege access

```bash
# Set proper permissions
chmod 600 /var/backups/autodocs/*.sql.gz
chown postgres:postgres /var/backups/autodocs/*.sql.gz
```

### Encryption at Rest

- Enable encryption on cloud storage buckets
- Use encrypted volumes for local backups
- Encrypt backup files before upload

### Audit Logging

Log all backup and restore operations:
- Who performed the operation
- When it was performed
- What was backed up/restored
- Success or failure status

## Backup Checklist

### Daily Tasks
- [ ] Verify automated backups completed
- [ ] Check backup file sizes
- [ ] Review backup logs for errors

### Weekly Tasks
- [ ] Test restore from random backup
- [ ] Clean up old backups per retention policy
- [ ] Verify backup encryption

### Monthly Tasks
- [ ] Full restore test to separate environment
- [ ] Review and update backup procedures
- [ ] Audit backup access logs
- [ ] Test disaster recovery procedures

### Quarterly Tasks
- [ ] Full DR drill
- [ ] Review and update RTO/RPO
- [ ] Test cross-region restore
- [ ] Update documentation

## Documentation

Keep this documentation updated with:
- Current backup schedules
- Storage locations
- Access credentials (in secure vault)
- Recent restore tests and results
- Lessons learned from incidents

## Support Contacts

**Backup Issues:**
- DevOps Team: devops@autodocs.ai
- On-Call: +1-555-0100

**Data Recovery:**
- Database Admin: dba@autodocs.ai
- Emergency: +1-555-0911

---

**Last Updated**: 2024-12-24
**Next Review**: 2025-03-24
**Owner**: DevOps Team
