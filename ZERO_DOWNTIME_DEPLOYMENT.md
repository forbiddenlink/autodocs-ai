# Zero-Downtime Deployment Guide

This document describes the zero-downtime deployment strategy for AutoDocs AI, ensuring the application remains available during deployments.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Implementation Details](#implementation-details)
- [Deployment Strategies](#deployment-strategies)
- [Testing Zero-Downtime](#testing-zero-downtime)
- [Troubleshooting](#troubleshooting)

## Overview

Zero-downtime deployment means deploying a new version of the application without interrupting service to users. Our implementation uses:

- **Graceful shutdown**: Existing connections complete before shutdown
- **Health checks**: Readiness and liveness probes for orchestrators
- **Load balancing**: Multiple instances handle traffic during rollout
- **Rolling updates**: New instances start before old ones stop

## Architecture

### Components

```
┌─────────────────────────────────────────────────┐
│           Load Balancer / Orchestrator          │
│         (Railway, Kubernetes, PM2, etc.)        │
└─────────────┬───────────────────────────────────┘
              │
              │ Health Checks:
              │ - /readiness → Traffic routing
              │ - /liveness  → Instance health
              │ - /health    → Overall status
              │
    ┌─────────┴──────────┐
    │                    │
    ▼                    ▼
┌─────────┐        ┌─────────┐
│Instance │        │Instance │
│   #1    │        │   #2    │
│(current)│        │  (new)  │
└─────────┘        └─────────┘
```

### Zero-Downtime Flow

1. **New version deployed**: New instance starts
2. **Health checks**: Orchestrator checks `/readiness`
3. **Traffic shift**: When ready, new instance receives traffic
4. **Graceful shutdown**: Old instance stops accepting new connections
5. **Connection drain**: Old instance finishes existing requests
6. **Complete**: Old instance shuts down after drain period

## Implementation Details

### 1. Graceful Shutdown Handler

Location: `backend/src/index.js`

```javascript
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  isShuttingDown = true;

  // Stop accepting new connections
  server.close(async () => {
    // Close database connections
    await pool.end();
    process.exit(0);
  });

  // Force shutdown after 30s timeout
  setTimeout(() => {
    process.exit(1);
  }, 30000);
};
```

**Key Features:**

- Stops accepting new connections immediately
- Allows existing connections to complete
- Closes database connections cleanly
- 30-second timeout for forced shutdown
- Responds to SIGTERM, SIGINT signals

### 2. Health Check Endpoints

#### `/health` - Overall Status

Returns comprehensive health information including database connectivity, memory usage, and uptime.

**Status Codes:**

- `200` - All systems operational
- `503` - Service degraded or unhealthy

**Use Case:** Monitoring dashboards, alerts

#### `/readiness` - Readiness Probe

Indicates if the instance is ready to receive traffic.

**Status Codes:**

- `200` - Ready to receive traffic
- `503` - Not ready (starting up or shutting down)

**Use Case:** Load balancer routing decisions

```javascript
app.get("/readiness", (req, res) => {
  if (isReady && !isShuttingDown) {
    res.status(200).json({ status: "ready" });
  } else {
    res.status(503).json({ status: "not_ready" });
  }
});
```

#### `/liveness` - Liveness Probe

Indicates if the process is alive and not deadlocked.

**Status Codes:**

- `200` - Process is alive

**Use Case:** Detect crashed or deadlocked instances

### 3. PM2 Configuration

Location: `backend/ecosystem.config.cjs`

**Zero-Downtime Settings:**

```javascript
{
  instances: 2,              // Run 2 instances
  exec_mode: "cluster",      // Cluster mode for zero-downtime
  wait_ready: true,          // Wait for readiness signal
  listen_timeout: 10000,     // Wait up to 10s for startup
  kill_timeout: 30000,       // 30s for graceful shutdown
  max_memory_restart: "500M", // Auto-restart on memory limit
}
```

**How It Works:**

1. PM2 starts new instance
2. Waits for `/readiness` to return 200
3. Routes traffic to new instance
4. Sends SIGTERM to old instance
5. Waits up to 30s for graceful shutdown
6. Force kills if timeout exceeded

### 4. Railway Configuration

Location: `backend/railway.json`

**Zero-Downtime Settings:**

```json
{
  "healthcheckPath": "/readiness",
  "healthcheckTimeout": 100,
  "numReplicas": 2,
  "restartTimeoutSeconds": 30
}
```

**How Railway Handles Deployment:**

1. Builds new version
2. Starts new replicas
3. Waits for health checks to pass
4. Routes traffic to new replicas
5. Stops old replicas after drain period

## Deployment Strategies

### Strategy 1: Rolling Update (Recommended)

**Best for:** Production deployments on Railway, Kubernetes

**Process:**

1. New version deployed to 50% of instances
2. Health checks verify new version works
3. Traffic gradually shifts to new instances
4. Old instances drain and shut down
5. Process repeats until all instances updated

**Advantages:**

- Zero downtime
- Easy rollback
- Gradual risk exposure

**Configuration (Railway):**

```json
{
  "numReplicas": 2,
  "healthcheckPath": "/readiness"
}
```

### Strategy 2: Blue-Green Deployment

**Best for:** Large, infrequent updates

**Process:**

1. Deploy entire new version (green) alongside old (blue)
2. Run tests on green environment
3. Switch load balancer to green
4. Keep blue running briefly for quick rollback
5. Decommission blue after verification period

**Advantages:**

- Instant rollback
- Full testing before switch
- No mixed versions

**Disadvantages:**

- Requires double resources temporarily

### Strategy 3: PM2 Cluster Mode

**Best for:** Single-server or VPS deployments

**Process:**

```bash
# Start with PM2 cluster mode
npm run start:pm2:prod

# Deploy new version with zero-downtime reload
git pull origin main
npm install
npm run reload:prod
```

**How PM2 Reload Works:**

1. Starts new worker process
2. Waits for readiness
3. Routes traffic to new worker
4. Stops old worker gracefully
5. Repeats for each worker

## Testing Zero-Downtime

### Local Testing with PM2

1. **Start the application in cluster mode:**

```bash
cd backend
npm run start:pm2
```

2. **Generate continuous traffic:**

```bash
# In a separate terminal, run continuous requests
while true; do
  curl -s http://localhost:3001/health | jq '.status'
  sleep 0.1
done
```

3. **Trigger a reload:**

```bash
# In another terminal
npm run reload
```

4. **Verify no errors:**

- Watch the traffic terminal
- Should see no connection errors
- All requests should succeed (200 status)
- No 503 errors during reload

### Load Testing Script

Create `scripts/test-zero-downtime.sh`:

```bash
#!/bin/bash

echo "Starting zero-downtime deployment test..."

# Start PM2 if not running
npm run start:pm2

# Generate traffic (100 requests/sec for 60 seconds)
echo "Generating traffic..."
ab -n 6000 -c 10 -g results.tsv http://localhost:3001/health &
LOAD_PID=$!

# Wait for traffic to start
sleep 5

# Trigger reload during traffic
echo "Triggering reload during active traffic..."
npm run reload

# Wait for reload to complete
sleep 10

# Check results
wait $LOAD_PID

echo "Test complete. Analyzing results..."
grep "Failed requests" results.tsv

# Success if 0 failed requests
```

### Production Verification

After deployment, verify zero-downtime:

```bash
# Check deployment logs
railway logs --tail 100

# Verify all instances are healthy
curl https://api.autodocs.ai/readiness

# Check metrics for any errors
curl https://api.autodocs.ai/api/metrics | jq '.http_errors_total'

# Review Sentry for any deployment-related errors
```

## Monitoring During Deployment

### Key Metrics to Watch

1. **HTTP Error Rate**
   - Should remain at baseline during deployment
   - Spike indicates deployment issue

2. **Response Time (p95, p99)**
   - Should stay consistent
   - Increase may indicate resource contention

3. **Active Connections**
   - Should gradually shift from old to new instances
   - No sudden drops

4. **Database Connection Pool**
   - Monitor for connection leaks
   - Pool should remain healthy

### Alert Thresholds

Set up alerts for:

- Error rate > 1% during deployment
- Response time > 2x baseline
- Health check failures > 3 consecutive
- Memory usage > 90%

## Rollback Procedures

### Automatic Rollback

Our CI/CD pipeline includes automatic rollback on failure:

```yaml
# .github/workflows/ci.yml
- name: Health check
  run: |
    sleep 30
    curl -f https://api.autodocs.ai/health || exit 1

- name: Rollback on failure
  if: failure()
  run: |
    curl -X POST ${{ secrets.RAILWAY_ROLLBACK_WEBHOOK }}
```

### Manual Rollback

#### Option 1: Railway Dashboard

1. Go to project → Deployments
2. Find last successful deployment
3. Click "Redeploy"

#### Option 2: PM2

```bash
# List processes and find version
pm2 list

# Delete current version
pm2 delete ecosystem.config.cjs

# Check out previous version
git checkout <previous-commit>
npm install

# Start previous version
npm run start:pm2:prod
```

#### Option 3: Git Revert

```bash
# Revert the problematic commit
git revert <bad-commit-hash>
git push origin main

# CI/CD will automatically deploy the revert
```

## Troubleshooting

### Issue: Deployment Hangs

**Symptoms:**

- New instance starts but never becomes ready
- Health checks timeout
- Old instance never shuts down

**Solutions:**

1. Check readiness endpoint: `curl http://localhost:3001/readiness`
2. Review startup logs: `npm run logs`
3. Verify database connectivity
4. Check environment variables
5. Increase `listen_timeout` in PM2 config

### Issue: 503 Errors During Deployment

**Symptoms:**

- Users see service unavailable errors
- Some requests fail during deployment

**Solutions:**

1. Verify graceful shutdown is working
2. Increase `kill_timeout` to allow more drain time
3. Check load balancer configuration
4. Ensure multiple instances are running
5. Review connection pool settings

### Issue: Old Instance Won't Shut Down

**Symptoms:**

- Old instance continues running after deployment
- Memory usage grows with multiple versions

**Solutions:**

1. Check for hung connections: `netstat -an | grep 3001`
2. Review logs for shutdown errors
3. Verify SIGTERM handler is registered
4. Check for infinite loops or deadlocks
5. May need to force kill: `pm2 delete <id>`

### Issue: Database Connection Errors

**Symptoms:**

- New instance fails health checks
- Database connection pool exhausted

**Solutions:**

1. Verify `DATABASE_URL` is set correctly
2. Check connection pool limits
3. Ensure old instances close connections on shutdown
4. Monitor active connections: `/api/metrics`
5. May need to adjust pool size in config

## Best Practices

### 1. Always Use Health Checks

Configure all orchestrators to use `/readiness` for routing decisions:

```json
// railway.json
{
  "healthcheckPath": "/readiness"
}
```

### 2. Set Appropriate Timeouts

Match timeouts across all layers:

- Application graceful shutdown: 30s
- PM2 kill_timeout: 30s
- Railway restartTimeout: 30s
- Load balancer connection timeout: < 30s

### 3. Monitor Deployments

Watch metrics during and after deployment:

- Error rates
- Response times
- Resource usage
- Active connections

### 4. Test Locally First

Always test with PM2 locally before production:

```bash
npm run start:pm2
# Make changes
npm run reload
# Verify no errors
```

### 5. Use Canary Deployments

For high-risk changes:

1. Deploy to 10% of instances first
2. Monitor for 10-15 minutes
3. Roll out to remaining instances
4. Keep rollback plan ready

### 6. Database Migrations

Run migrations before deploying code:

```bash
# Run migrations first
DATABASE_URL=$PROD_DB npm run migrate

# Then deploy application code
git push origin main
```

This ensures new code is compatible with schema.

## Additional Resources

- [PM2 Documentation - Cluster Mode](https://pm2.keymetrics.io/docs/usage/cluster-mode/)
- [Railway Documentation - Health Checks](https://docs.railway.app/deploy/healthchecks)
- [Node.js Graceful Shutdown](https://nodejs.org/api/process.html#process_signal_events)
- [Load Balancing Strategies](https://www.nginx.com/blog/load-balancing-strategies/)

## Summary

Zero-downtime deployment is achieved through:

1. ✅ **Graceful shutdown** - Existing connections complete
2. ✅ **Health checks** - Readiness/liveness probes
3. ✅ **Multiple instances** - Load balancing during rollout
4. ✅ **Proper timeouts** - Coordinated across all layers
5. ✅ **Monitoring** - Continuous verification
6. ✅ **Rollback plan** - Quick recovery on issues

With these practices, deployments happen seamlessly without user impact.

---

Last updated: 2024-12-24
