#!/bin/bash

# AutoDocs AI - Staging Deployment Script
# This script deploys to staging environment (develop branch)

set -e  # Exit on error

echo "=========================================="
echo "AutoDocs AI - Staging Deployment"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "develop" ]; then
  echo -e "${YELLOW}⚠ Warning: You're on branch '$CURRENT_BRANCH', not 'develop'${NC}"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 1
  fi
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
  echo -e "${RED}❌ Error: You have uncommitted changes${NC}"
  echo "Please commit or stash your changes before deploying"
  exit 1
fi

# Run tests
echo -e "${YELLOW}Running tests...${NC}"
npm test --prefix backend || {
  echo -e "${RED}❌ Tests failed${NC}"
  exit 1
}
echo -e "${GREEN}✅ Tests passed${NC}"

# Run linter
echo -e "${YELLOW}Running linter...${NC}"
npm run lint || {
  echo -e "${RED}❌ Linting failed${NC}"
  exit 1
}
echo -e "${GREEN}✅ Linting passed${NC}"

# Build frontend
echo -e "${YELLOW}Building frontend...${NC}"
npm run build || {
  echo -e "${RED}❌ Build failed${NC}"
  exit 1
}
echo -e "${GREEN}✅ Build successful${NC}"

# Deploy to Vercel (staging)
echo -e "${YELLOW}Deploying frontend to Vercel (staging)...${NC}"
vercel --yes || {
  echo -e "${RED}❌ Vercel deployment failed${NC}"
  exit 1
}
echo -e "${GREEN}✅ Frontend deployed${NC}"

# Deploy to Railway (staging)
echo -e "${YELLOW}Deploying backend to Railway (staging)...${NC}"
railway up --environment staging || {
  echo -e "${RED}❌ Railway deployment failed${NC}"
  exit 1
}
echo -e "${GREEN}✅ Backend deployed${NC}"

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
railway run --environment staging npm --prefix backend run migrate || {
  echo -e "${RED}❌ Migrations failed${NC}"
  exit 1
}
echo -e "${GREEN}✅ Migrations complete${NC}"

# Health check
echo -e "${YELLOW}Running health check...${NC}"
sleep 10
curl -f https://staging-api.autodocs.ai/health || {
  echo -e "${RED}❌ Health check failed${NC}"
  exit 1
}
echo -e "${GREEN}✅ Health check passed${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Staging deployment successful!${NC}"
echo "=========================================="
echo ""
echo "Staging URL: https://staging.autodocs.ai"
echo "Backend API: https://staging-api.autodocs.ai"
echo ""
echo "Next steps:"
echo "1. Test the changes on staging"
echo "2. If everything works, merge to main for production deploy"
echo ""
