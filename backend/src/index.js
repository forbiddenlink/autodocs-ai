import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import morgan from "morgan";
import { logger } from "./utils/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { correlationIdMiddleware } from "./middleware/correlationId.js";
import pool from "./config/database.js";
import {
  initSentry,
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
} from "./config/sentry.js";
import { metricsMiddleware, metricsEndpoint, getMetricsJSON } from "./middleware/metrics.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Sentry (must be done before any routes)
initSentry(app);

// Sentry request handler - must be first
app.use(sentryRequestHandler());
app.use(sentryTracingHandler());

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Correlation ID middleware for request tracking
app.use(correlationIdMiddleware);

// Logging middleware with correlation ID
app.use(
  morgan("combined", {
    stream: {
      write: (message) =>
        logger.info(message.trim(), {
          type: "http_request",
        }),
    },
  })
);

// Performance monitoring middleware
app.use(metricsMiddleware);

// Enhanced health check endpoint with comprehensive status checks
app.get("/health", async (req, res) => {
  const startTime = Date.now();
  const healthCheck = {
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
    services: {},
  };

  try {
    // Check database connectivity
    try {
      const dbStart = Date.now();
      await pool.query("SELECT 1 as health_check");
      const dbDuration = Date.now() - dbStart;

      healthCheck.services.database = {
        status: "healthy",
        responseTime: `${dbDuration}ms`,
      };

      logger.info("Health check: Database healthy", {
        service: "database",
        responseTime: dbDuration,
        correlationId: req.headers["x-correlation-id"],
      });
    } catch (dbError) {
      healthCheck.services.database = {
        status: "unhealthy",
        error: dbError.message,
      };
      healthCheck.status = "degraded";

      logger.error("Health check: Database unhealthy", {
        service: "database",
        error: dbError.message,
        correlationId: req.headers["x-correlation-id"],
      });
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    healthCheck.services.memory = {
      status: "healthy",
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
    };

    const responseTime = Date.now() - startTime;
    healthCheck.responseTime = `${responseTime}ms`;

    // Return appropriate status code
    const statusCode = healthCheck.status === "ok" ? 200 : 503;

    logger.info("Health check completed", {
      status: healthCheck.status,
      responseTime,
      correlationId: req.headers["x-correlation-id"],
    });

    res.status(statusCode).json(healthCheck);
  } catch (error) {
    logger.error("Health check failed", {
      error: error.message,
      stack: error.stack,
      correlationId: req.headers["x-correlation-id"],
    });

    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: "Health check failed",
      message: error.message,
    });
  }
});

// Metrics endpoints
// Prometheus-compatible metrics endpoint
app.get("/metrics", metricsEndpoint);

// JSON metrics endpoint for internal dashboards
app.get("/api/metrics", async (req, res) => {
  try {
    const metrics = await getMetricsJSON();
    res.json(metrics);
  } catch (error) {
    logger.error("Error fetching metrics", { error: error.message });
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

// API routes (to be added)
// app.use('/api/auth', authRoutes);
// app.use('/api/repos', repoRoutes);
// app.use('/api/webhooks', webhookRoutes);

// Test error endpoint (for testing Sentry)
app.get("/test-error", (req, res) => {
  throw new Error("Test error for Sentry integration");
});

// 404 handler
app.use(notFoundHandler);

// Sentry error handler - must be before other error handlers
app.use(sentryErrorHandler());

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 AutoDocs Backend running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  logger.info(`🔗 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
});

export default app;
