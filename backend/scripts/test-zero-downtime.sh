#!/bin/bash

# Zero-Downtime Deployment Test Script
# This script verifies that the application can handle deployments without downtime

set -e

BACKEND_URL="http://localhost:3001"
TEST_DURATION=30
REQUESTS_PER_SEC=5
TOTAL_REQUESTS=$((TEST_DURATION * REQUESTS_PER_SEC))

echo "=========================================="
echo "Zero-Downtime Deployment Test"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 is not installed${NC}"
    echo "Install with: npm install -g pm2"
    exit 1
fi

echo -e "${GREEN}✓${NC} PM2 is installed"

# Check if backend is running
if pm2 list | grep -q "autodocs-backend"; then
    echo -e "${YELLOW}⚠${NC} Backend is already running with PM2. Stopping..."
    pm2 delete autodocs-backend 2>/dev/null || true
    sleep 2
fi

# Start backend with PM2 in cluster mode
echo ""
echo "Starting backend with PM2 (cluster mode, 2 instances)..."
npm run start:pm2

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s $BACKEND_URL/readiness | grep -q "ready"; then
        echo -e "${GREEN}✓${NC} Backend is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Backend failed to start${NC}"
        pm2 logs --lines 50
        exit 1
    fi
    sleep 1
done

echo ""
echo "=========================================="
echo "Phase 1: Baseline Testing"
echo "=========================================="

# Test health endpoints
echo ""
echo "Testing health endpoints..."

# Test /health
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL/health)
if [ "$HEALTH_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✓${NC} /health endpoint: OK (200)"
else
    echo -e "${RED}❌${NC} /health endpoint: Failed ($HEALTH_STATUS)"
fi

# Test /readiness
READINESS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL/readiness)
if [ "$READINESS_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✓${NC} /readiness endpoint: OK (200)"
else
    echo -e "${RED}❌${NC} /readiness endpoint: Failed ($READINESS_STATUS)"
fi

# Test /liveness
LIVENESS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL/liveness)
if [ "$LIVENESS_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✓${NC} /liveness endpoint: OK (200)"
else
    echo -e "${RED}❌${NC} /liveness endpoint: Failed ($LIVENESS_STATUS)"
fi

echo ""
echo "=========================================="
echo "Phase 2: Zero-Downtime Reload Test"
echo "=========================================="
echo ""
echo "This test will:"
echo "1. Generate continuous traffic ($REQUESTS_PER_SEC req/s for ${TEST_DURATION}s)"
echo "2. Trigger PM2 reload during traffic"
echo "3. Verify no requests fail"
echo ""

# Create results file
RESULTS_FILE="zero-downtime-test-results.log"
rm -f $RESULTS_FILE

# Start traffic generation in background
echo "Starting traffic generation..."
(
    SUCCESS_COUNT=0
    FAIL_COUNT=0
    ERROR_503_COUNT=0
    START_TIME=$(date +%s)

    for i in $(seq 1 $TOTAL_REQUESTS); do
        RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL/health 2>&1)

        if [ "$RESPONSE" = "200" ]; then
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        elif [ "$RESPONSE" = "503" ]; then
            ERROR_503_COUNT=$((ERROR_503_COUNT + 1))
            FAIL_COUNT=$((FAIL_COUNT + 1))
            echo "[$(date +%T)] 503 Service Unavailable" >> $RESULTS_FILE
        else
            FAIL_COUNT=$((FAIL_COUNT + 1))
            echo "[$(date +%T)] Failed with status: $RESPONSE" >> $RESULTS_FILE
        fi

        sleep 0.2  # 5 requests per second
    done

    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))

    # Write summary
    echo "" >> $RESULTS_FILE
    echo "========================================" >> $RESULTS_FILE
    echo "Test Results Summary" >> $RESULTS_FILE
    echo "========================================" >> $RESULTS_FILE
    echo "Total Requests: $TOTAL_REQUESTS" >> $RESULTS_FILE
    echo "Successful: $SUCCESS_COUNT" >> $RESULTS_FILE
    echo "Failed: $FAIL_COUNT" >> $RESULTS_FILE
    echo "503 Errors: $ERROR_503_COUNT" >> $RESULTS_FILE
    echo "Success Rate: $(awk "BEGIN {printf \"%.2f\", ($SUCCESS_COUNT/$TOTAL_REQUESTS)*100}")%" >> $RESULTS_FILE
    echo "Test Duration: ${DURATION}s" >> $RESULTS_FILE
) &

TRAFFIC_PID=$!

# Wait for traffic to establish
echo "Waiting for traffic to establish (5s)..."
sleep 5

# Trigger reload during traffic
echo ""
echo -e "${YELLOW}⚡ Triggering PM2 reload during active traffic...${NC}"
echo ""
pm2 reload ecosystem.config.cjs

echo ""
echo "Reload initiated. Monitoring..."
echo ""

# Show PM2 status during reload
sleep 2
pm2 list

# Wait for traffic generation to complete
echo ""
echo "Waiting for traffic generation to complete..."
wait $TRAFFIC_PID

echo ""
echo "=========================================="
echo "Phase 3: Results Analysis"
echo "=========================================="
echo ""

# Display results
if [ -f $RESULTS_FILE ]; then
    cat $RESULTS_FILE

    # Check for failures
    FAIL_COUNT=$(grep -c "Failed\|503" $RESULTS_FILE 2>/dev/null || echo "0")

    echo ""
    echo "=========================================="
    if [ "$FAIL_COUNT" -eq 0 ]; then
        echo -e "${GREEN}✅ ZERO-DOWNTIME TEST PASSED${NC}"
        echo "No requests failed during deployment!"
    else
        echo -e "${RED}❌ ZERO-DOWNTIME TEST FAILED${NC}"
        echo "Found $FAIL_COUNT failed requests"
        echo ""
        echo "Failed requests:"
        grep "Failed\|503" $RESULTS_FILE | head -20
    fi
    echo "=========================================="
else
    echo -e "${RED}❌ Results file not found${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo "Phase 4: Cleanup"
echo "=========================================="
echo ""

# Show final PM2 status
echo "Final PM2 Status:"
pm2 list

# Ask if user wants to stop PM2
echo ""
read -p "Stop PM2 processes? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pm2 delete autodocs-backend
    echo -e "${GREEN}✓${NC} PM2 processes stopped"
else
    echo "PM2 processes still running. Stop with: npm run stop"
fi

echo ""
echo "Test complete! Results saved to: $RESULTS_FILE"
echo ""

# Exit with appropriate code
if [ "$FAIL_COUNT" -eq 0 ]; then
    exit 0
else
    exit 1
fi
