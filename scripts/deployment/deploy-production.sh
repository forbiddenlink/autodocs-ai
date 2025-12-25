#!/bin/bash

# AutoDocs AI - Production Deployment Script
# This script deploys to production environment (main branch)

set -e  # Exit on error

echo "=========================================="
echo "AutoDocs AI - Production Deployment"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo -e "${RED}❌ Error: You must be on 'main' branch to deploy to production${NC}"
  echo "Current branch: $CURRENT_BRANCH"
  exit 1
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
  echo -e "${RED}❌ Error: You have uncommitted changes${NC}"
  echo "Please commit or stash your changes before deploying"
  exit 1
fi

# Confirm production deployment
echo -e "${YELLOW}⚠ WARNING: This will deploy to PRODUCTION${NC}"
echo ""
read -p "Are you sure you want to deploy to production? (yes/no) " -r
echo
if [[ ! $REPLY =~ ^yes$ ]]; then
  echo "Deployment cancelled"
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

# Security audit
echo -e "${YELLOW}Running security audit...${NC}"
npm audit --production || {
  echo -e "${YELLOW}⚠ Security vulnerabilities detected${NC}"
  read -p "Continue anyway? (yes/no) " -r
  if [[ ! $REPLY =~ ^yes$ ]]; then
    exit 1
  fi
}
echo -e "${GREEN}✅ Security audit complete${NC}"

# Build frontend
echo -e "${YELLOW}Building frontend...${NC}"
NEXT_PUBLIC_BASE_URL=https://autodocs.ai npm run build || {
  echo -e "${RED}❌ Build failed${NC}"
  exit 1
}
echo -e "${GREEN}✅ Build successful${NC}"

# Deploy to Vercel (production)
echo -e "${YELLOW}Deploying frontend to Vercel (production)...${NC}"
vercel --prod --yes || {
  echo -e "${RED}❌ Vercel deployment failed${NC}"
  exit 1
}
echo -e "${GREEN}✅ Frontend deployed${NC}"

# Deploy to Railway (production)
echo -e "${YELLOW}Deploying backend to Railway (production)...${NC}"
railway up --environment production || {
  echo -e "${RED}❌ Railway deployment failed${NC}"
  echo -e "${YELLOW}Initiating rollback...${NC}"
  vercel rollback
  exit 1
}
echo -e "${GREEN}✅ Backend deployed${NC}"

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
railway run --environment production npm --prefix backend run migrate || {
  echo -e "${RED}❌ Migrations failed${NC}"
  echo -e "${YELLOW}You may need to rollback manually${NC}"
  exit 1
}
echo -e "${GREEN}✅ Migrations complete${NC}"

# Health check
echo -e "${YELLOW}Running health check...${NC}"
sleep 15
curl -f https://api.autodocs.ai/health || {
  echo -e "${RED}❌ Health check failed${NC}"
  echo -e "${YELLOW}Deployment may have issues. Check logs immediately.${NC}"
  exit 1
}
echo -e "${GREEN}✅ Health check passed${NC}"

# Smoke tests
echo -e "${YELLOW}Running smoke tests...${NC}"
curl -f https://autodocs.ai || {
  echo -e "${RED}❌ Frontend smoke test failed${NC}"
  exit 1
}
echo -e "${GREEN}✅ Smoke tests passed${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 Production deployment successful!${NC}"
echo "=========================================="
echo ""
echo "Production URL: https://autodocs.ai"
echo "Backend API: https://api.autodocs.ai"
echo ""
echo "Post-deployment checklist:"
echo "1. ✅ Tests passed"
echo "2. ✅ Build successful"
echo "3. ✅ Deployed to Vercel"
echo "4. ✅ Deployed to Railway"
echo "5. ✅ Migrations run"
echo "6. ✅ Health check passed"
echo ""
echo "Monitoring:"
echo "- Check Sentry for errors: https://sentry.io"
echo "- Monitor metrics: https://api.autodocs.ai/metrics"
echo "- Check logs in Vercel/Railway dashboards"
echo ""
