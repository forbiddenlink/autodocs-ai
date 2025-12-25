#!/bin/bash

# AutoDocs AI - Database Restore Script
# This script restores a database from a backup file

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -lt 1 ]; then
    echo "Usage: $0 <backup_file.sql.gz> [target_database]"
    echo ""
    echo "Examples:"
    echo "  $0 backups/autodocs_20241224_120000.sql.gz"
    echo "  $0 backups/autodocs_20241224_120000.sql.gz autodocs_restored"
    echo ""
    exit 1
fi

BACKUP_FILE=$1
TARGET_DB=${2:-autodocs_dev}

echo "========================================="
echo "AutoDocs AI Database Restore"
echo "========================================="
echo "Backup file: $BACKUP_FILE"
echo "Target database: $TARGET_DB"
echo "========================================="

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Verify backup file integrity
echo -e "${YELLOW}⏳ Verifying backup file integrity...${NC}"
if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
    echo -e "${GREEN}✅ Backup file integrity verified${NC}"
else
    echo -e "${RED}❌ Error: Backup file is corrupted or invalid${NC}"
    exit 1
fi

# Check if PostgreSQL is accessible
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ Error: psql not found. Please install PostgreSQL client tools.${NC}"
    exit 1
fi

# Check if target database exists
if psql -lqt | cut -d \| -f 1 | grep -qw "$TARGET_DB"; then
    echo -e "${YELLOW}⚠️  Warning: Database '$TARGET_DB' already exists${NC}"
    read -p "Do you want to drop and recreate it? (yes/no): " CONFIRM

    if [ "$CONFIRM" != "yes" ]; then
        echo "Restore cancelled"
        exit 0
    fi

    echo -e "${YELLOW}⏳ Dropping existing database...${NC}"
    dropdb "$TARGET_DB"
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Error: Failed to drop database${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Database dropped${NC}"
fi

# Create new database
echo -e "${YELLOW}⏳ Creating database '$TARGET_DB'...${NC}"
createdb "$TARGET_DB"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Failed to create database${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Database created${NC}"

# Restore backup
echo -e "${YELLOW}⏳ Restoring backup (this may take a while)...${NC}"
START_TIME=$(date +%s)

gunzip -c "$BACKUP_FILE" | psql "$TARGET_DB" > /tmp/restore_log.txt 2>&1

if [ $? -eq 0 ]; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))

    echo -e "${GREEN}✅ Restore completed successfully${NC}"
    echo "   Duration: ${DURATION}s"

    # Validate restoration
    echo -e "${YELLOW}⏳ Validating restored data...${NC}"

    TABLE_COUNT=$(psql -t "$TARGET_DB" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ')

    if [ ! -z "$TABLE_COUNT" ] && [ "$TABLE_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ Validation successful${NC}"
        echo "   Tables restored: $TABLE_COUNT"

        # Show counts for main tables if they exist
        for table in users repositories documents analysis_jobs; do
            if psql -t "$TARGET_DB" -c "\dt $table" 2>/dev/null | grep -q "$table"; then
                COUNT=$(psql -t "$TARGET_DB" -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')
                echo "   $table: $COUNT rows"
            fi
        done

        echo "========================================="
        echo -e "${GREEN}✅ Database restored successfully${NC}"
        echo "========================================="
        echo ""
        echo "Next steps:"
        echo "1. Update DATABASE_URL in .env if needed:"
        echo "   DATABASE_URL=postgresql://localhost/$TARGET_DB"
        echo ""
        echo "2. Run migrations to ensure schema is up-to-date:"
        echo "   cd backend && npm run migrate"
        echo ""
        echo "3. Restart application services"
        echo ""
        exit 0
    else
        echo -e "${RED}❌ Warning: Restore completed but validation failed${NC}"
        echo "No tables found in restored database"
        exit 1
    fi
else
    echo -e "${RED}❌ Restore failed!${NC}"
    echo "Check /tmp/restore_log.txt for details"
    exit 1
fi
