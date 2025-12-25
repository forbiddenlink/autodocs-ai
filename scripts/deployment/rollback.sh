#!/bin/bash

# AutoDocs AI - Rollback Script
# This script rolls back to the previous deployment

set -e  # Exit on error

echo "=========================================="
echo "AutoDocs AI - Rollback Procedure"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Ask for environment
echo "Which environment do you want to rollback?"
echo "1) Staging"
echo "2) Production"
read -p "Enter choice (1 or 2): " ENV_CHOICE

if [ "$ENV_CHOICE" == "1" ]; then
  ENV="staging"
  FRONTEND_URL="https://staging.autodocs.ai"
  API_URL="https://staging-api.autodocs.ai"
elif [ "$ENV_CHOICE" == "2" ]; then
  ENV="production"
  FRONTEND_URL="https://autodocs.ai"
  API_URL="https://api.autodocs.ai"

  echo -e "${RED}⚠ WARNING: This will rollback PRODUCTION${NC}"
  read -p "Are you absolutely sure? (yes/no) " -r
  if [[ ! $REPLY =~ ^yes$ ]]; then
    echo "Rollback cancelled"
    exit 1
  fi
else
  echo -e "${RED}Invalid choice${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}Rolling back $ENV environment...${NC}"
echo ""

# Rollback frontend (Vercel)
echo -e "${YELLOW}Rolling back frontend...${NC}"
vercel rollback || {
  echo -e "${RED}❌ Frontend rollback failed${NC}"
  echo "You may need to rollback manually via Vercel dashboard"
  exit 1
}
echo -e "${GREEN}✅ Frontend rolled back${NC}"

# Rollback backend (Railway)
echo -e "${YELLOW}Rolling back backend...${NC}"
echo "Please rollback backend manually via Railway dashboard:"
echo "1. Go to Railway dashboard"
echo "2. Select your project"
echo "3. Go to Deployments"
echo "4. Find the previous successful deployment"
echo "5. Click 'Redeploy'"
echo ""
read -p "Press Enter after you've completed the manual rollback..."

# Rollback database (if needed)
echo ""
read -p "Do you need to rollback database migrations? (y/n) " -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  read -p "How many migrations to rollback? " ROLLBACK_COUNT
  echo -e "${YELLOW}Rolling back $ROLLBACK_COUNT database migration(s)...${NC}"

  for i in $(seq 1 $ROLLBACK_COUNT); do
    railway run --environment $ENV npm --prefix backend run migrate:rollback || {
      echo -e "${RED}❌ Database rollback failed at step $i${NC}"
      exit 1
    }
    echo -e "${GREEN}✅ Rolled back migration $i of $ROLLBACK_COUNT${NC}"
  done
fi

# Health check
echo ""
echo -e "${YELLOW}Running health check...${NC}"
sleep 10
curl -f $API_URL/health || {
  echo -e "${RED}❌ Health check failed${NC}"
  echo "The rollback may have issues. Check logs immediately."
  exit 1
}
echo -e "${GREEN}✅ Health check passed${NC}"

# Smoke test
echo -e "${YELLOW}Running smoke test...${NC}"
curl -f $FRONTEND_URL || {
  echo -e "${RED}❌ Frontend smoke test failed${NC}"
  exit 1
}
echo -e "${GREEN}✅ Smoke test passed${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Rollback complete${NC}"
echo "=========================================="
echo ""
echo "Environment: $ENV"
echo "Frontend: $FRONTEND_URL"
echo "Backend: $API_URL"
echo ""
echo "Next steps:"
echo "1. Verify the application is working correctly"
echo "2. Investigate the issue that caused the rollback"
echo "3. Fix the issue and redeploy"
echo "4. Update incident log"
echo ""
