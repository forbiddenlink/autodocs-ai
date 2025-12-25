import client from "prom-client";
import { logger } from "../utils/logger.js";

// Create a Registry
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10], // Buckets in seconds
  registers: [register],
});

const httpRequestTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

const httpRequestErrors = new client.Counter({
  name: "http_request_errors_total",
  help: "Total number of HTTP request errors",
  labelNames: ["method", "route", "error_type"],
  registers: [register],
});

const dbQueryDuration = new client.Histogram({
  name: "db_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["query_type", "table"],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register],
});

const activeConnections = new client.Gauge({
  name: "active_connections",
  help: "Number of active connections",
  registers: [register],
});

const throughput = new client.Counter({
  name: "throughput_bytes_total",
  help: "Total bytes processed",
  labelNames: ["direction"], // 'in' or 'out'
  registers: [register],
});

// Middleware to track request metrics
export function metricsMiddleware(req, res, next) {
  const start = Date.now();

  // Track active connections
  activeConnections.inc();

  // Track request size
  const requestSize = parseInt(req.get("content-length") || "0", 10);
  if (requestSize > 0) {
    throughput.inc({ direction: "in" }, requestSize);
  }

  // Override res.send to capture response
  const originalSend = res.send;
  res.send = function (data) {
    // Track response size
    const responseSize = Buffer.byteLength(JSON.stringify(data || ""));
    throughput.inc({ direction: "out" }, responseSize);

    originalSend.call(this, data);
  };

  // Track response
  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const route = req.route ? req.route.path : req.path;
    const method = req.method;
    const statusCode = res.statusCode;

    // Record metrics
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);

    httpRequestTotal.inc({
      method,
      route,
      status_code: statusCode,
    });

    // Track errors (4xx and 5xx)
    if (statusCode >= 400) {
      const errorType = statusCode >= 500 ? "server_error" : "client_error";
      httpRequestErrors.inc({
        method,
        route,
        error_type: errorType,
      });
    }

    // Decrement active connections
    activeConnections.dec();

    // Log slow requests (> 1 second)
    if (duration > 1) {
      logger.warn("Slow request detected", {
        method,
        route,
        duration: `${duration.toFixed(2)}s`,
        statusCode,
      });
    }
  });

  next();
}

// Function to record database query metrics
export function recordDbQuery(queryType, table, durationMs) {
  const durationSeconds = durationMs / 1000;
  dbQueryDuration.observe({ query_type: queryType, table }, durationSeconds);

  // Log slow queries (> 100ms)
  if (durationMs > 100) {
    logger.warn("Slow database query detected", {
      queryType,
      table,
      duration: `${durationMs.toFixed(2)}ms`,
    });
  }
}

// Endpoint to expose metrics for Prometheus
export function metricsEndpoint(req, res) {
  res.set("Content-Type", register.contentType);
  register
    .metrics()
    .then((metrics) => {
      res.send(metrics);
    })
    .catch((err) => {
      logger.error("Error generating metrics", { error: err.message });
      res.status(500).send("Error generating metrics");
    });
}

// Get current metrics as JSON (for internal monitoring dashboard)
export async function getMetricsJSON() {
  const metrics = await register.getMetricsAsJSON();

  // Calculate derived metrics
  const summary = {
    timestamp: new Date().toISOString(),
    system: {},
    http: {
      totalRequests: 0,
      totalErrors: 0,
      averageResponseTime: 0,
      requestsPerSecond: 0,
    },
    database: {
      averageQueryTime: 0,
      slowQueries: 0,
    },
  };

  // Parse metrics
  metrics.forEach((metric) => {
    if (metric.name === "http_requests_total") {
      summary.http.totalRequests = metric.values.reduce((sum, v) => sum + v.value, 0);
    } else if (metric.name === "http_request_errors_total") {
      summary.http.totalErrors = metric.values.reduce((sum, v) => sum + v.value, 0);
    } else if (metric.name === "http_request_duration_seconds") {
      const sum = metric.values.find((v) => v.metricName?.includes("sum"))?.value || 0;
      const count = metric.values.find((v) => v.metricName?.includes("count"))?.value || 1;
      summary.http.averageResponseTime = (sum / count).toFixed(3);
    } else if (metric.name === "process_cpu_user_seconds_total") {
      summary.system.cpuUsage = metric.values[0]?.value || 0;
    } else if (metric.name === "nodejs_heap_size_used_bytes") {
      summary.system.memoryUsedMB = ((metric.values[0]?.value || 0) / 1024 / 1024).toFixed(2);
    }
  });

  // Calculate error rate
  if (summary.http.totalRequests > 0) {
    summary.http.errorRate =
      ((summary.http.totalErrors / summary.http.totalRequests) * 100).toFixed(2) + "%";
  } else {
    summary.http.errorRate = "0%";
  }

  return {
    summary,
    detailed: metrics,
  };
}

export { register };
