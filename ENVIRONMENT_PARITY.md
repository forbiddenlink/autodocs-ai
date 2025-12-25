# Environment Parity Guide

## Overview

This document ensures consistency between development, staging, and production environments for AutoDocs AI. Following the [12-Factor App](https://12factor.net/) methodology, we maintain environment parity to minimize bugs and deployment issues.

## Environment Definitions

### Development (Local)
- **Purpose**: Local development and testing
- **Access**: All developers
- **Data**: Synthetic/test data
- **URLs**:
  - Frontend: `http://localhost:3000`
  - Backend: `http://localhost:3001`

### Staging
- **Purpose**: Pre-production testing and QA
- **Access**: Development team + QA
- **Data**: Anonymized production-like data
- **URLs**:
  - Frontend: `https://staging.autodocs.ai`
  - Backend: `https://api-staging.autodocs.ai`

### Production
- **Purpose**: Live application serving end users
- **Access**: DevOps team only (automated deployments)
- **Data**: Real customer data
- **URLs**:
  - Frontend: `https://autodocs.ai`
  - Backend: `https://api.autodocs.ai`

## Parity Checklist

### ✅ Language & Runtime Versions

All environments must use the same versions:

```json
{
  "node": "20.19.5",
  "npm": "10.8.2",
  "postgres": "14.x",
  "next": "16.1.1"
}
```

**Enforcement:**
- Use `.nvmrc` file for Node version
- Lock dependencies with `package-lock.json`
- Document versions in README
- CI/CD checks version compatibility

**Verification:**
```bash
# Check Node version
node --version  # Should match across environments

# Check npm version
npm --version

# Check PostgreSQL version
psql --version
```

### ✅ Dependencies

**Frontend Dependencies** (`package.json`):
```json
{
  "dependencies": {
    "next": "16.1.1",
    "react": "^19.0.0",
    "tailwindcss": "^3.4.1"
    // ... all deps locked in package-lock.json
  }
}
```

**Backend Dependencies** (`backend/package.json`):
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "winston": "^3.11.0"
    // ... all deps locked in package-lock.json
  }
}
```

**Parity Rules:**
- ✅ Identical `package.json` across environments
- ✅ Committed `package-lock.json` for reproducibility
- ✅ No `devDependencies` in production builds
- ✅ Regular security updates applied to all environments

### ✅ Infrastructure Configuration

#### Frontend (Next.js)

**Deployment Platform**: Vercel (all environments)

| Setting | Development | Staging | Production |
|---------|-------------|---------|------------|
| **Node Version** | 20.19.5 | 20.19.5 | 20.19.5 |
| **Build Command** | `next dev` | `next build` | `next build` |
| **Output** | Development | Static/SSR | Static/SSR |
| **Framework** | Next.js | Next.js | Next.js |
| **Region** | N/A | us-east-1 | us-east-1 |

#### Backend (Express)

**Deployment Platform**: Railway (staging/production), Local (development)

| Setting | Development | Staging | Production |
|---------|-------------|---------|------------|
| **Node Version** | 20.19.5 | 20.19.5 | 20.19.5 |
| **Process Manager** | nodemon | Node | Node |
| **Instances** | 1 | 2 | 4+ |
| **Region** | N/A | us-east-1 | us-east-1 |

#### Database (PostgreSQL)

| Setting | Development | Staging | Production |
|---------|-------------|---------|------------|
| **Version** | 14.x | 14.x | 14.x |
| **Provider** | Local | Railway | Railway |
| **Backups** | Manual | Daily | Hourly |
| **Replicas** | 0 | 0 | 2 |
| **Connection Pool** | 20 | 50 | 100 |

### ✅ Environment Variables

All environments use the same variable names with environment-specific values.

#### Required Variables (All Environments)

```bash
# Application
NODE_ENV=development|staging|production
PORT=3001

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Authentication
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
JWT_SECRET=xxx

# AI Services
ANTHROPIC_API_KEY=xxx
PINECONE_API_KEY=xxx
PINECONE_ENVIRONMENT=xxx
PINECONE_INDEX=autodocs

# Monitoring
SENTRY_DSN=xxx
LOG_LEVEL=info|debug|error

# CDN (Optional)
CDN_URL=xxx
```

**Environment-Specific Files:**
```
.env.local           # Development (not in git)
.env.staging         # Staging (not in git)
.env.production      # Production (not in git)
.env.example         # Template (in git)
```

**Verification Script** (`scripts/check-env.sh`):
```bash
#!/bin/bash
# Verify all required environment variables are set

REQUIRED_VARS=(
  "NODE_ENV"
  "DATABASE_URL"
  "GITHUB_CLIENT_ID"
  "GITHUB_CLIENT_SECRET"
  "ANTHROPIC_API_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing required variable: $var"
    exit 1
  fi
done

echo "✅ All required environment variables are set"
```

### ✅ Data Similarity

#### Development
- Small synthetic dataset
- Test users with known credentials
- Sample repositories (public)

#### Staging
- Anonymized production data (last 30 days)
- Similar data volume to production
- PII removed/anonymized

#### Production
- Real customer data
- Full historical data
- PII protection enabled

**Data Refresh:**
```bash
# Refresh staging data from production (monthly)
# 1. Backup production
pg_dump production_db > backup.sql

# 2. Anonymize data
psql < anonymize.sql

# 3. Restore to staging
psql staging_db < backup_anonymized.sql
```

### ✅ Services & Integrations

All external services should have environment-specific configurations:

| Service | Development | Staging | Production |
|---------|-------------|---------|------------|
| **GitHub OAuth** | Test App | Staging App | Production App |
| **Claude API** | Development Key | Staging Key | Production Key |
| **Pinecone** | Dev Index | Staging Index | Prod Index |
| **Sentry** | Dev Project | Staging Project | Prod Project |
| **CDN** | Disabled | CloudFlare | CloudFlare |

### ✅ Feature Flags

Use environment variables for feature flags:

```javascript
// backend/src/config/features.js
export const features = {
  enableNewUI: process.env.FEATURE_NEW_UI === 'true',
  enableAIChat: process.env.FEATURE_AI_CHAT === 'true',
  enableWebhooks: process.env.FEATURE_WEBHOOKS === 'true',
  rateLimit: parseInt(process.env.RATE_LIMIT || '100')
};
```

**Configuration:**
- Development: All features enabled
- Staging: Same as production (for testing)
- Production: Controlled rollout

## Deployment Process

### Development → Staging

```bash
# 1. Ensure all tests pass
npm test

# 2. Create pull request
git checkout -b feature/new-feature
git push origin feature/new-feature

# 3. Code review and approval

# 4. Merge to staging branch
git checkout staging
git merge feature/new-feature

# 5. Deploy to staging (automatic via CI/CD)
# Vercel/Railway auto-deploys on push to staging branch

# 6. Run smoke tests
npm run test:staging
```

### Staging → Production

```bash
# 1. Verify staging deployment
curl https://api-staging.autodocs.ai/health

# 2. Run full test suite on staging
npm run test:e2e

# 3. Get approval from stakeholders

# 4. Merge to main branch
git checkout main
git merge staging

# 5. Tag release
git tag -a v1.2.3 -m "Release v1.2.3"
git push --tags

# 6. Deploy to production (automatic via CI/CD)

# 7. Monitor deployment
# - Check error rates in Sentry
# - Check metrics in /metrics endpoint
# - Check health endpoint

# 8. Rollback if needed
git revert <commit-hash>
```

## Configuration Management

### Version Locking

**package.json:**
```json
{
  "engines": {
    "node": "20.19.5",
    "npm": "10.8.2"
  }
}
```

**.nvmrc:**
```
20.19.5
```

**Docker (if using):**
```dockerfile
FROM node:20.19.5-alpine
```

### Dependency Management

```bash
# Install exact versions
npm ci

# Update dependencies (test in development first)
npm update

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

### Infrastructure as Code

Use configuration files for infrastructure:

**Vercel (vercel.json):**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

**Railway (railway.json):**
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 2,
    "sleepApplication": false,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

## Monitoring Parity

### Logging

All environments use the same logging format:

```javascript
// Structured JSON logs
logger.info('Request processed', {
  method: req.method,
  path: req.path,
  status: res.statusCode,
  duration: duration,
  correlationId: req.correlationId
});
```

### Metrics

Same metrics tracked across all environments:
- Request duration
- Error rates
- Database query performance
- Memory usage
- CPU usage

**Access:**
- Development: `http://localhost:3001/metrics`
- Staging: `https://api-staging.autodocs.ai/metrics`
- Production: `https://api.autodocs.ai/metrics`

### Error Tracking

Sentry configured identically with environment tags:

```javascript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.GIT_COMMIT,
  tracesSampleRate: 0.1
});
```

## Testing Environment Parity

### Automated Checks

Create a parity check script (`scripts/check-parity.sh`):

```bash
#!/bin/bash

echo "Checking environment parity..."

# Check Node version
NODE_VERSION=$(node --version)
echo "Node version: $NODE_VERSION"

# Check dependencies
echo "Checking dependencies..."
npm ci --dry-run

# Check environment variables
echo "Checking environment variables..."
bash scripts/check-env.sh

# Check database version
echo "Checking database version..."
psql --version

echo "✅ Parity check complete"
```

### Manual Verification

**Monthly Checklist:**
- [ ] Compare dependency versions across environments
- [ ] Verify database schemas match
- [ ] Check environment variable configurations
- [ ] Test feature flags in staging before production
- [ ] Review infrastructure settings
- [ ] Validate monitoring and logging

## Common Pitfalls

### ❌ Don't Do This

1. **Different Node versions**
   ```bash
   # Development: Node 18
   # Production: Node 20
   # ❌ Will cause runtime errors
   ```

2. **Missing environment variables**
   ```bash
   # Works locally but fails in production
   # ❌ Always use environment variables
   ```

3. **Different dependency versions**
   ```bash
   # Development has updated package
   # Production still using old version
   # ❌ Keep package-lock.json in sync
   ```

4. **Different database schemas**
   ```bash
   # Staging has new migrations
   # Production schema outdated
   # ❌ Run migrations in all environments
   ```

### ✅ Do This

1. **Lock all versions**
   - Use package-lock.json
   - Specify engine versions
   - Use .nvmrc

2. **Automate deployments**
   - CI/CD pipelines
   - Automated migrations
   - Health checks

3. **Monitor differences**
   - Track configuration drift
   - Alert on version mismatches
   - Regular parity audits

## Summary

✅ **Same Language/Runtime**: Node 20.19.5 everywhere
✅ **Same Dependencies**: Locked with package-lock.json
✅ **Same Infrastructure**: Vercel + Railway + PostgreSQL
✅ **Similar Data**: Anonymized production data in staging
✅ **Same Configuration**: Environment variables with same names
✅ **Same Monitoring**: Sentry + Metrics + Logging
✅ **Same Process**: Git → Staging → Production

---

**Last Updated**: 2024-12-24
**Next Review**: 2025-01-24
**Owner**: DevOps Team
