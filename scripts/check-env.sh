#!/bin/bash

# AutoDocs AI - Environment Variables Check Script
# Verifies all required environment variables are set

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo "AutoDocs AI Environment Check"
echo "========================================="
echo "Environment: ${NODE_ENV:-not set}"
echo "========================================="

# Required variables for backend
BACKEND_REQUIRED=(
  "NODE_ENV"
  "DATABASE_URL"
  "GITHUB_CLIENT_ID"
  "GITHUB_CLIENT_SECRET"
  "JWT_SECRET"
  "ANTHROPIC_API_KEY"
  "PINECONE_API_KEY"
  "PINECONE_ENVIRONMENT"
  "PINECONE_INDEX"
)

# Optional but recommended
BACKEND_OPTIONAL=(
  "PORT"
  "FRONTEND_URL"
  "SENTRY_DSN"
  "LOG_LEVEL"
  "CDN_URL"
)

# Check backend variables
echo ""
echo "Checking Backend Environment Variables..."
echo "========================================="

MISSING_COUNT=0
for var in "${BACKEND_REQUIRED[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${RED}❌ Missing required variable: $var${NC}"
    MISSING_COUNT=$((MISSING_COUNT + 1))
  else
    # Mask sensitive values
    if [[ $var == *"SECRET"* ]] || [[ $var == *"KEY"* ]] || [[ $var == *"PASSWORD"* ]]; then
      VALUE="********"
    else
      VALUE="${!var}"
    fi
    echo -e "${GREEN}✅ $var${NC} = $VALUE"
  fi
done

echo ""
echo "Optional Variables:"
for var in "${BACKEND_OPTIONAL[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${YELLOW}⚠️  Not set (optional): $var${NC}"
  else
    if [[ $var == *"SECRET"* ]] || [[ $var == *"KEY"* ]]; then
      VALUE="********"
    else
      VALUE="${!var}"
    fi
    echo -e "${GREEN}✅ $var${NC} = $VALUE"
  fi
done

# Summary
echo ""
echo "========================================="
if [ $MISSING_COUNT -eq 0 ]; then
  echo -e "${GREEN}✅ All required environment variables are set${NC}"
  exit 0
else
  echo -e "${RED}❌ Missing $MISSING_COUNT required variable(s)${NC}"
  echo ""
  echo "Please create a .env file with the required variables."
  echo "See .env.example for a template."
  exit 1
fi
