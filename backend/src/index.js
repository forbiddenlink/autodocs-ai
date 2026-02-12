import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
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
import authRoutes from "./routes/auth.js";
import testAuthRoutes from "./routes/test-auth.js";
import repoRoutes from "./routes/repos.js";
import testDbRoutes from "./routes/test-db.js";
import webhookRoutes from "./routes/webhooks.js";
import githubRoutes from "./routes/github.js";
import { swaggerSpec, swaggerUiServe, swaggerUiSetup } from "./config/swagger.js";
import { checkRedisHealth, closeRedisConnection } from "./config/redis.js";
import { createDocumentationWorker, closeWorker } from "./workers/documentationWorker.js";
import { closeQueues } from "./services/jobQueueService.js";
import { checkEmbeddingHealth } from "./services/embeddingService.js";

// Get the directory name of the current module
// Trigger restart - using PORT=4000
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: join(__dirname, "../.env") });

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
app.use(cookieParser());

// Rate limiting configuration
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: "Too many login attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: "Too many requests, please slow down" },
  standardHeaders: true,
  legacyHeaders: false,
});

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

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns server health status including database connectivity and memory usage
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *       503:
 *         description: Server is unhealthy or degraded
 */
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

    // Check Redis connectivity
    try {
      const redisStart = Date.now();
      const redisHealth = await checkRedisHealth();
      const redisDuration = Date.now() - redisStart;

      healthCheck.services.redis = {
        status: redisHealth.status,
        responseTime: `${redisDuration}ms`,
        ...(redisHealth.error && { error: redisHealth.error }),
      };

      if (redisHealth.status !== "healthy") {
        healthCheck.status = "degraded";
      }

      logger.info("Health check: Redis", {
        service: "redis",
        status: redisHealth.status,
        responseTime: redisDuration,
        correlationId: req.headers["x-correlation-id"],
      });
    } catch (redisError) {
      healthCheck.services.redis = {
        status: "unhealthy",
        error: redisError.message,
      };
      // Redis is optional, mark as degraded but not fully down
      if (healthCheck.status === "ok") {
        healthCheck.status = "degraded";
      }
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    healthCheck.services.memory = {
      status: "healthy",
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
    };

    // Check embedding service
    try {
      const embeddingHealth = await checkEmbeddingHealth();
      healthCheck.services.embeddings = embeddingHealth;

      // Degraded if using placeholder embeddings, but not unhealthy
      if (embeddingHealth.status === "degraded") {
        logger.info("Health check: Embeddings using placeholder mode", {
          service: "embeddings",
          message: embeddingHealth.message,
        });
      } else if (embeddingHealth.status === "unhealthy") {
        if (healthCheck.status === "ok") {
          healthCheck.status = "degraded";
        }
      }
    } catch (embeddingError) {
      healthCheck.services.embeddings = {
        status: "unhealthy",
        error: embeddingError.message,
      };
      if (healthCheck.status === "ok") {
        healthCheck.status = "degraded";
      }
    }

    // Worker status
    healthCheck.services.worker = {
      status: documentationWorker ? "running" : "not_started",
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

// API routes with rate limiting
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/repos", apiLimiter, repoRoutes);
app.use("/api/github", apiLimiter, githubRoutes);
app.use("/api/webhooks", webhookRoutes);

// API Documentation (Swagger/OpenAPI)
app.use("/api/docs", swaggerUiServe, swaggerUiSetup);
app.get("/api/docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});
logger.info("📚 API documentation available at /api/docs");

// Test auth routes (synchronously available, no database required)
if (process.env.NODE_ENV !== "production") {
  app.use("/api/test-auth", testAuthRoutes);
  logger.info("✅ Test auth routes registered at /api/test-auth");
}

// Development-only auth routes (for testing without real OAuth/database) - loaded synchronously
if (process.env.NODE_ENV !== "production") {
  const authDevModule = await import("./routes/auth-dev.js");
  app.use("/api/auth-dev", authDevModule.default);
  logger.info("✅ Development auth routes registered at /api/auth-dev");
}

// Test database routes (for development/testing only)
if (process.env.NODE_ENV !== "production") {
  app.use("/api/test-db", testDbRoutes);
  logger.info("✅ Test database routes registered at /api/test-db");
}

// app.use('/api/webhooks', webhookRoutes);  // To be added

// Track server readiness for health checks
let isReady = false;
let isShuttingDown = false;

// Worker instance (initialized after server starts)
let documentationWorker = null;

// Readiness probe endpoint (for deployment orchestrators)
app.get("/readiness", (req, res) => {
  if (isReady && !isShuttingDown) {
    res.status(200).json({
      status: "ready",
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: "not_ready",
      shuttingDown: isShuttingDown,
      timestamp: new Date().toISOString(),
    });
  }
});

// Liveness probe endpoint (for deployment orchestrators)
app.get("/liveness", (req, res) => {
  // As long as the process is running, we're alive
  res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

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
const server = app.listen(PORT, async () => {
  logger.info(`AutoDocs Backend running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
  logger.info(`Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);

  // Start documentation worker if Redis is available
  if (process.env.REDIS_HOST || process.env.NODE_ENV === "development") {
    try {
      documentationWorker = createDocumentationWorker();
      logger.info("Documentation worker started");
    } catch (workerError) {
      logger.warn("Could not start documentation worker - Redis may not be available", {
        error: workerError.message,
      });
    }
  }

  // Mark server as ready after startup
  isReady = true;
  logger.info("Server is ready to accept connections");
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  isShuttingDown = true;

  // Stop accepting new connections immediately
  server.close(async () => {
    logger.info("HTTP server closed. No longer accepting new connections.");

    try {
      // Close documentation worker
      if (documentationWorker) {
        logger.info("Closing documentation worker...");
        await closeWorker(documentationWorker);
        logger.info("Documentation worker closed.");
      }

      // Close job queues
      logger.info("Closing job queues...");
      await closeQueues();
      logger.info("Job queues closed.");

      // Close Redis connections
      logger.info("Closing Redis connections...");
      await closeRedisConnection();
      logger.info("Redis connections closed.");

      // Close database connections
      logger.info("Closing database connection pool...");
      await pool.end();
      logger.info("Database connection pool closed.");

      logger.info("Graceful shutdown completed successfully");
      process.exit(0);
    } catch (error) {
      logger.error("Error during graceful shutdown", {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds if graceful shutdown hasn't completed
  setTimeout(() => {
    logger.error("Graceful shutdown timed out after 30s. Forcing shutdown.");
    process.exit(1);
  }, 30000);
};

// Listen for termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", {
    error: error.message,
    stack: error.stack,
  });
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Promise Rejection", {
    reason: reason,
    promise: promise,
  });
});

export default app;
