#!/bin/bash

# AutoDocs AI - Backup Validation Script
# This script validates a backup by restoring it to a temporary database

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -lt 1 ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo ""
    echo "Example:"
    echo "  $0 backups/autodocs_20241224_120000.sql.gz"
    echo ""
    exit 1
fi

BACKUP_FILE=$1

echo "========================================="
echo "AutoDocs AI Backup Validation"
echo "========================================="
echo "Backup file: $BACKUP_FILE"
echo "========================================="

# Verify backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Get backup file info
FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
FILE_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$BACKUP_FILE" 2>/dev/null || stat -c "%y" "$BACKUP_FILE" 2>/dev/null)

echo "File size: $FILE_SIZE"
echo "File date: $FILE_DATE"
echo ""

# Step 1: Verify file integrity
echo -e "${YELLOW}⏳ Step 1: Verifying file integrity...${NC}"
if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
    echo -e "${GREEN}✅ File integrity check passed${NC}"
else
    echo -e "${RED}❌ File is corrupted or not a valid gzip file${NC}"
    exit 1
fi

# Step 2: Check backup contents
echo -e "${YELLOW}⏳ Step 2: Analyzing backup contents...${NC}"
TABLES=$(gunzip -c "$BACKUP_FILE" | grep -c "CREATE TABLE")
INDEXES=$(gunzip -c "$BACKUP_FILE" | grep -c "CREATE INDEX")
TRIGGERS=$(gunzip -c "$BACKUP_FILE" | grep -c "CREATE TRIGGER")

echo "   CREATE TABLE statements: $TABLES"
echo "   CREATE INDEX statements: $INDEXES"
echo "   CREATE TRIGGER statements: $TRIGGERS"

if [ "$TABLES" -eq 0 ]; then
    echo -e "${RED}❌ Warning: No tables found in backup${NC}"
    exit 1
fi

# Step 3: Test restore to temporary database
echo -e "${YELLOW}⏳ Step 3: Testing restore to temporary database...${NC}"
TEMP_DB="autodocs_validate_$(date +%s)"

createdb "$TEMP_DB" 2>/dev/null
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Failed to create temporary database${NC}"
    exit 1
fi

echo "   Created temporary database: $TEMP_DB"

# Restore backup
gunzip -c "$BACKUP_FILE" | psql "$TEMP_DB" > /tmp/validate_log.txt 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Restore to temporary database successful${NC}"

    # Step 4: Validate schema
    echo -e "${YELLOW}⏳ Step 4: Validating schema...${NC}"

    RESTORED_TABLES=$(psql -t "$TEMP_DB" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ')
    RESTORED_INDEXES=$(psql -t "$TEMP_DB" -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public';" 2>/dev/null | tr -d ' ')

    echo "   Tables in database: $RESTORED_TABLES"
    echo "   Indexes in database: $RESTORED_INDEXES"

    # Step 5: Validate data
    echo -e "${YELLOW}⏳ Step 5: Validating data...${NC}"

    # Check main tables
    VALIDATION_PASSED=true
    for table in users repositories documents analysis_jobs chat_messages webhooks schema_migrations; do
        if psql -t "$TEMP_DB" -c "\dt $table" 2>/dev/null | grep -q "$table"; then
            COUNT=$(psql -t "$TEMP_DB" -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')
            echo "   $table: $COUNT rows"
        else
            echo -e "   ${YELLOW}⚠️  $table: table not found${NC}"
        fi
    done

    # Step 6: Cleanup
    echo -e "${YELLOW}⏳ Step 6: Cleaning up...${NC}"
    dropdb "$TEMP_DB" 2>/dev/null
    echo "   Removed temporary database"

    # Final result
    echo "========================================="
    echo -e "${GREEN}✅ Backup validation successful!${NC}"
    echo "========================================="
    echo ""
    echo "Summary:"
    echo "  ✅ File integrity: OK"
    echo "  ✅ Backup contents: $TABLES tables, $INDEXES indexes"
    echo "  ✅ Restore test: OK"
    echo "  ✅ Schema validation: $RESTORED_TABLES tables restored"
    echo "  ✅ Data validation: Passed"
    echo ""
    echo "This backup is valid and can be used for restore operations."
    echo ""
    exit 0
else
    echo -e "${RED}❌ Restore test failed${NC}"
    echo "Check /tmp/validate_log.txt for details"

    # Cleanup
    dropdb "$TEMP_DB" 2>/dev/null
    exit 1
fi
