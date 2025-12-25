# AutoDocs AI - Deployment Guide

This document describes the automated deployment process for AutoDocs AI.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Zero-Downtime Deployment](#zero-downtime-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Environments](#environments)
- [Deployment Process](#deployment-process)
- [Rollback Procedure](#rollback-procedure)
- [Manual Deployment](#manual-deployment)
- [Troubleshooting](#troubleshooting)

## Overview

AutoDocs AI uses a fully automated CI/CD pipeline powered by GitHub Actions. Every push to `main` or `develop` triggers automated tests, builds, and deployments.

### Deployment Stack

- **Frontend**: Vercel (Next.js)
- **Backend**: Railway (Node.js/Express)
- **Database**: PostgreSQL (Railway managed)
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry (errors), Prometheus (metrics)

## Architecture

```
┌─────────────────┐
│  GitHub Repo    │
│   (main/dev)    │
└────────┬────────┘
         │ push
         ▼
┌─────────────────┐
│ GitHub Actions  │
│  CI/CD Pipeline │
├─────────────────┤
│ 1. Lint & Test  │
│ 2. Build        │
│ 3. Security     │
│ 4. Deploy       │
└────────┬────────┘
         │
    ┌────┴─────┐
    │          │
    ▼          ▼
┌────────┐ ┌─────────┐
│ Vercel │ │ Railway │
│Frontend│ │ Backend │
└────────┘ └─────────┘
```

## Zero-Downtime Deployment

AutoDocs AI implements **zero-downtime deployment** to ensure uninterrupted service during updates.

### Key Features

- **Graceful Shutdown**: Existing connections complete before server shutdown
- **Health Checks**: Readiness (`/readiness`) and liveness (`/liveness`) probes
- **Rolling Updates**: New instances start before old ones stop
- **Load Balancing**: Multiple replicas handle traffic during deployment
- **Automatic Rollback**: Failed deployments roll back automatically

### Health Check Endpoints

- `/health` - Overall system health (database, memory, uptime)
- `/readiness` - Instance readiness for traffic (200 = ready, 503 = not ready)
- `/liveness` - Process health check (always returns 200 if running)

### How It Works

1. New version is deployed to Railway
2. Railway starts new replicas (2 instances)
3. Health checks verify new instances are ready (`/readiness`)
4. Traffic routes to new instances
5. Old instances receive SIGTERM and stop accepting new connections
6. Old instances complete existing requests (30s timeout)
7. Old instances shut down gracefully

**Result**: Zero service interruption for users during deployment.

For detailed information on zero-downtime deployment, see [ZERO_DOWNTIME_DEPLOYMENT.md](./ZERO_DOWNTIME_DEPLOYMENT.md).

## CI/CD Pipeline

Our GitHub Actions pipeline runs on every push and pull request:

### Pipeline Stages

1. **Lint & Format Check** (parallel)
   - ESLint on frontend and backend
   - Prettier format check
   - Fails if code style violations found

2. **Build** (parallel with tests)
   - Build Next.js frontend
   - Upload build artifacts
   - Verify no build errors

3. **Test** (parallel with build)
   - Run backend unit tests
   - Run integration tests
   - Coverage reporting

4. **Security Audit** (parallel)
   - npm audit for vulnerabilities
   - Check for outdated dependencies
   - Fail on high/critical vulnerabilities

5. **Deploy to Staging** (`develop` branch only)
   - Deploy frontend to Vercel preview
   - Deploy backend to Railway staging
   - Run database migrations
   - Health check validation

6. **Deploy to Production** (`main` branch only)
   - Deploy frontend to Vercel production
   - Deploy backend to Railway production
   - Run database migrations
   - Health check validation
   - Automatic rollback on failure

### Pipeline Configuration

File: `.github/workflows/ci.yml`

Key features:

- Runs on Node.js 20.x
- Caches dependencies for faster builds
- Parallel execution where possible
- Environment-specific deployments
- Automatic rollback on failure

## Environments

### Staging (develop branch)

- **URL**: https://staging.autodocs.ai
- **Purpose**: Testing and QA
- **Database**: Staging database (copy of prod schema)
- **Auto-deploy**: Yes (on push to `develop`)
- **Approval**: Not required

### Production (main branch)

- **URL**: https://autodocs.ai
- **Purpose**: Live user traffic
- **Database**: Production database
- **Auto-deploy**: Yes (on push to `main`)
- **Approval**: Can be configured in GitHub settings

## Deployment Process

### Automatic Deployment (Recommended)

1. **Merge to develop** (for staging):

   ```bash
   git checkout develop
   git merge feature-branch
   git push origin develop
   ```

2. **Monitor pipeline**:
   - Go to GitHub Actions tab
   - Watch the pipeline progress
   - Review logs if any step fails

3. **Verify staging**:
   - Visit https://staging.autodocs.ai
   - Test the changes
   - Check error logs in Sentry

4. **Merge to main** (for production):

   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```

5. **Production deployment**:
   - Pipeline automatically deploys
   - Runs health checks
   - Rollback if checks fail

### Required GitHub Secrets

Configure these in GitHub repository settings (Settings → Secrets and variables → Actions):

```
# Vercel
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id

# Railway
RAILWAY_STAGING_WEBHOOK=staging_deploy_webhook
RAILWAY_PRODUCTION_WEBHOOK=production_deploy_webhook
RAILWAY_ROLLBACK_WEBHOOK=rollback_webhook

# Database
DATABASE_URL=postgresql://...

# Monitoring (optional)
SENTRY_DSN=your_sentry_dsn
```

## Rollback Procedure

### Automatic Rollback

The pipeline automatically rolls back if:

- Health check fails after deployment
- Database migration fails
- Critical error detected

### Manual Rollback

If you need to manually rollback:

#### Option 1: Revert Git Commit

```bash
# Find the last good commit
git log --oneline

# Revert to that commit
git revert <bad-commit-hash>
git push origin main

# Pipeline will automatically deploy the reverted code
```

#### Option 2: Vercel Rollback

```bash
# Via Vercel CLI
vercel rollback

# Or via Vercel Dashboard
# Visit project → Deployments → Select previous deployment → Promote to Production
```

#### Option 3: Railway Rollback

```bash
# Via Railway Dashboard
# Visit project → Deployments → Select previous deployment → Redeploy
```

### Database Rollback

```bash
# SSH into Railway backend or run locally
npm --prefix backend run migrate:rollback

# Specify number of migrations to rollback
DATABASE_URL=<prod-db-url> npm --prefix backend run migrate:rollback
```

## Manual Deployment

For emergency deploys or testing:

### Frontend (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to staging
vercel

# Deploy to production
vercel --prod
```

### Backend (Railway)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Link to project
railway link

# Deploy to staging
railway up --environment staging

# Deploy to production
railway up --environment production
```

### Database Migrations

```bash
# Staging
DATABASE_URL=<staging-db-url> npm --prefix backend run migrate

# Production
DATABASE_URL=<prod-db-url> npm --prefix backend run migrate
```

## Monitoring Deployments

### Health Checks

After deployment, verify:

```bash
# Check backend health
curl https://api.autodocs.ai/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-12-24T...",
  "environment": "production",
  "services": {
    "database": "healthy"
  }
}
```

### Logs

- **Frontend logs**: Vercel Dashboard → Your Project → Logs
- **Backend logs**: Railway Dashboard → Your Project → Logs
- **Error tracking**: Sentry Dashboard
- **Metrics**: Prometheus endpoint at `/metrics`

### Alerts

Set up alerts for:

- Deployment failures (GitHub Actions notifications)
- Health check failures (uptimerobot.com or similar)
- Error rate spikes (Sentry alerts)
- Performance degradation (Sentry performance monitoring)

## Troubleshooting

### Build Fails

**Problem**: Next.js build fails

**Solution**:

1. Check error logs in GitHub Actions
2. Run build locally: `npm run build`
3. Fix TypeScript errors or missing dependencies
4. Push fix and pipeline will re-run

### Deployment Fails

**Problem**: Vercel/Railway deployment fails

**Solution**:

1. Check deployment logs in respective dashboards
2. Verify all environment variables are set
3. Check for breaking API changes
4. Review recent commits for issues

### Health Check Fails

**Problem**: `/health` endpoint returns 503

**Solution**:

1. Check database connectivity
2. Review backend logs for errors
3. Verify environment variables
4. Check Railway service status

### Database Migration Fails

**Problem**: Migration fails during deployment

**Solution**:

1. Review migration SQL for syntax errors
2. Check database permissions
3. Test migration locally first
4. Rollback if needed: `npm run migrate:rollback`

### Tests Fail in CI

**Problem**: Tests pass locally but fail in CI

**Solution**:

1. Check for environment-specific issues
2. Verify test database setup
3. Check for timezone differences
4. Review test logs in GitHub Actions

## Security Considerations

### Secrets Management

- Never commit secrets to Git
- Use GitHub Secrets for CI/CD
- Rotate secrets regularly
- Use different secrets for staging/production

### Access Control

- Require code review before merging to `main`
- Enable branch protection rules
- Require CI checks to pass before merge
- Limit who can approve production deploys

### Monitoring

- Monitor for unauthorized access attempts
- Track API usage patterns
- Set up rate limiting
- Enable Sentry security monitoring

## Performance

### Build Times

- Typical build time: 2-3 minutes
- Frontend build: ~1 minute
- Backend tests: ~30 seconds
- Deployment: ~1 minute

### Optimization

- Uses npm ci for faster installs
- Caches dependencies between runs
- Parallel job execution
- Incremental builds when possible

## Maintenance

### Weekly Tasks

- Review deployment logs
- Check for dependency updates
- Monitor error rates
- Review security alerts

### Monthly Tasks

- Update dependencies
- Review and optimize CI/CD pipeline
- Test rollback procedures
- Update documentation

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

## Support

For deployment issues:

1. Check this documentation
2. Review GitHub Actions logs
3. Check platform status pages (Vercel, Railway)
4. Contact DevOps team

---

Last updated: 2024-12-24
