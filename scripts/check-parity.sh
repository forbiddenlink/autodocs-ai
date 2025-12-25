#!/bin/bash

# AutoDocs AI - Environment Parity Check Script
# Verifies consistency across environments

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================="
echo "AutoDocs AI Environment Parity Check"
echo "========================================="
echo ""

ISSUES_FOUND=0

# Check 1: Node.js Version
echo -e "${BLUE}[1/6] Checking Node.js version...${NC}"
EXPECTED_NODE="20.19.5"
CURRENT_NODE=$(node --version | sed 's/v//')

if [ "$CURRENT_NODE" == "$EXPECTED_NODE" ]; then
  echo -e "${GREEN}✅ Node.js version: $CURRENT_NODE${NC}"
else
  echo -e "${RED}❌ Node.js version mismatch${NC}"
  echo "   Expected: $EXPECTED_NODE"
  echo "   Current:  $CURRENT_NODE"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi
echo ""

# Check 2: npm Version
echo -e "${BLUE}[2/6] Checking npm version...${NC}"
NPM_VERSION=$(npm --version)
echo -e "${GREEN}✅ npm version: $NPM_VERSION${NC}"
echo ""

# Check 3: Dependencies Integrity
echo -e "${BLUE}[3/6] Checking dependencies integrity...${NC}"

# Frontend dependencies
if [ -f "package-lock.json" ]; then
  echo -e "${GREEN}✅ Frontend package-lock.json exists${NC}"
else
  echo -e "${RED}❌ Frontend package-lock.json missing${NC}"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Backend dependencies
if [ -f "backend/package-lock.json" ]; then
  echo -e "${GREEN}✅ Backend package-lock.json exists${NC}"
else
  echo -e "${RED}❌ Backend package-lock.json missing${NC}"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi
echo ""

# Check 4: PostgreSQL Version
echo -e "${BLUE}[4/6] Checking PostgreSQL version...${NC}"
if command -v psql &> /dev/null; then
  PG_VERSION=$(psql --version | awk '{print $3}' | cut -d. -f1)
  EXPECTED_PG="14"

  if [ "$PG_VERSION" == "$EXPECTED_PG" ]; then
    echo -e "${GREEN}✅ PostgreSQL version: $PG_VERSION${NC}"
  else
    echo -e "${YELLOW}⚠️  PostgreSQL version: $PG_VERSION (expected: $EXPECTED_PG)${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  PostgreSQL not found (may be remote)${NC}"
fi
echo ""

# Check 5: Environment Variables
echo -e "${BLUE}[5/6] Checking environment variables...${NC}"

REQUIRED_VARS=(
  "NODE_ENV"
  "DATABASE_URL"
  "GITHUB_CLIENT_ID"
  "ANTHROPIC_API_KEY"
)

MISSING_VARS=0
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${RED}❌ Missing: $var${NC}"
    MISSING_VARS=$((MISSING_VARS + 1))
  fi
done

if [ $MISSING_VARS -eq 0 ]; then
  echo -e "${GREEN}✅ All required variables set${NC}"
else
  echo -e "${RED}❌ Missing $MISSING_VARS required variable(s)${NC}"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi
echo ""

# Check 6: File Structure
echo -e "${BLUE}[6/6] Checking file structure...${NC}"

REQUIRED_FILES=(
  "package.json"
  "backend/package.json"
  ".nvmrc"
  ".gitignore"
  "next.config.ts"
  "tailwind.config.ts"
)

MISSING_FILES=0
for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✅ $file${NC}"
  else
    echo -e "${RED}❌ Missing: $file${NC}"
    MISSING_FILES=$((MISSING_FILES + 1))
  fi
done

if [ $MISSING_FILES -gt 0 ]; then
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi
echo ""

# Summary
echo "========================================="
echo "Parity Check Summary"
echo "========================================="

if [ $ISSUES_FOUND -eq 0 ]; then
  echo -e "${GREEN}✅ All parity checks passed!${NC}"
  echo ""
  echo "Environment is properly configured and consistent."
  echo ""
  exit 0
else
  echo -e "${RED}❌ Found $ISSUES_FOUND issue(s)${NC}"
  echo ""
  echo "Please review and fix the issues above."
  echo "See ENVIRONMENT_PARITY.md for detailed guidance."
  echo ""
  exit 1
fi
