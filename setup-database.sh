#!/bin/bash
# Database Setup Script for AutoDocs AI
# This script creates the PostgreSQL database and runs migrations

set -e  # Exit on error

echo "=========================================="
echo "AutoDocs AI - Database Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if PostgreSQL is running
echo "Checking PostgreSQL status..."
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo -e "${RED}❌ PostgreSQL is not running${NC}"
    echo ""
    echo "To start PostgreSQL:"
    echo "  - macOS with Postgres.app: Open Postgres.app"
    echo "  - macOS with Homebrew: brew services start postgresql"
    echo "  - Linux: sudo systemctl start postgresql"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ PostgreSQL is running${NC}"
echo ""

# Database name
DB_NAME="autodocs_dev"

# Check if database exists
if psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo -e "${YELLOW}⚠ Database '$DB_NAME' already exists${NC}"
    read -p "Do you want to recreate it? This will delete all data. (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Dropping existing database..."
        dropdb $DB_NAME
        echo -e "${GREEN}✓ Database dropped${NC}"
    else
        echo "Keeping existing database"
    fi
fi

# Create database if it doesn't exist
if ! psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "Creating database '$DB_NAME'..."
    createdb $DB_NAME
    echo -e "${GREEN}✓ Database created${NC}"
fi

echo ""
echo "Running migrations..."
cd backend && npm run migrate

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Database setup complete!${NC}"
echo "=========================================="
echo ""
echo "Database: $DB_NAME"
echo "Connection string: postgresql://localhost:5432/$DB_NAME"
echo ""
echo "Next steps:"
echo "  1. Start the backend: cd backend && npm run dev"
echo "  2. Start the frontend: npm run dev"
echo "  3. Test the application: http://localhost:3000"
echo ""
