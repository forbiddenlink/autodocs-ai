#!/bin/bash

# AutoDocs AI - Database Backup Script
# This script creates compressed backups of the PostgreSQL database

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATABASE_NAME="${DATABASE_NAME:-autodocs_dev}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/autodocs_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "========================================="
echo "AutoDocs AI Database Backup"
echo "========================================="
echo "Database: $DATABASE_NAME"
echo "Timestamp: $TIMESTAMP"
echo "Backup file: $BACKUP_FILE"
echo "Retention: $RETENTION_DAYS days"
echo "========================================="

# Check if PostgreSQL is accessible
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}❌ Error: pg_dump not found. Please install PostgreSQL client tools.${NC}"
    exit 1
fi

# Test database connection
if ! psql -d "$DATABASE_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Cannot connect to database '$DATABASE_NAME'${NC}"
    echo "Please check:"
    echo "  - Database exists"
    echo "  - PostgreSQL is running"
    echo "  - DATABASE_URL environment variable is set"
    exit 1
fi

# Create backup
echo -e "${YELLOW}⏳ Creating backup...${NC}"
START_TIME=$(date +%s)

pg_dump "$DATABASE_NAME" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

    echo -e "${GREEN}✅ Backup successful!${NC}"
    echo "   File: $BACKUP_FILE"
    echo "   Size: $FILE_SIZE"
    echo "   Duration: ${DURATION}s"

    # Verify backup integrity
    echo -e "${YELLOW}⏳ Verifying backup integrity...${NC}"
    if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
        echo -e "${GREEN}✅ Backup file integrity verified${NC}"
    else
        echo -e "${RED}❌ Warning: Backup file may be corrupted${NC}"
        exit 1
    fi

    # Remove backups older than retention period
    echo -e "${YELLOW}⏳ Cleaning up old backups...${NC}"
    DELETED=$(find "$BACKUP_DIR" -name "autodocs_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
    if [ $DELETED -gt 0 ]; then
        echo -e "${GREEN}✅ Removed $DELETED backup(s) older than $RETENTION_DAYS days${NC}"
    else
        echo "   No old backups to remove"
    fi

    # Show remaining backups
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/autodocs_*.sql.gz 2>/dev/null | wc -l)
    echo "   Total backups: $BACKUP_COUNT"

    # Calculate total backup size
    TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    echo "   Total size: $TOTAL_SIZE"

    echo "========================================="
    echo -e "${GREEN}✅ Backup completed successfully${NC}"
    echo "========================================="
    exit 0
else
    echo -e "${RED}❌ Backup failed!${NC}"
    echo "Check PostgreSQL logs for details"
    exit 1
fi
