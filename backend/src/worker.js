#!/usr/bin/env node
/**
 * Standalone documentation worker process
 *
 * This script runs the BullMQ worker separately from the main API server.
 * This is useful for:
 * - Scaling workers independently from API servers
 * - Running workers on separate machines
 * - Isolating worker crashes from API availability
 *
 * Usage:
 *   node src/worker.js
 *   # or with PM2:
 *   pm2 start src/worker.js --name autodocs-worker
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { logger } from "./utils/logger.js";
import { createDocumentationWorker, closeWorker } from "./workers/documentationWorker.js";
import { closeQueues, getQueueStats, QUEUE_NAMES } from "./services/jobQueueService.js";
import { closeRedisConnection, checkRedisHealth } from "./config/redis.js";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: join(__dirname, "../.env") });

logger.info("Starting documentation worker process...");
logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
logger.info(`Redis host: ${process.env.REDIS_HOST || "localhost"}`);
logger.info(`Redis port: ${process.env.REDIS_PORT || "6379"}`);
logger.info(`Worker concurrency: ${process.env.WORKER_CONCURRENCY || "3"}`);

let worker = null;
let isShuttingDown = false;

/**
 * Initialize and start the worker
 */
async function start() {
  try {
    // Check Redis connectivity
    const redisHealth = await checkRedisHealth();
    if (redisHealth.status !== "healthy") {
      logger.error("Redis is not healthy, cannot start worker", {
        error: redisHealth.error,
      });
      process.exit(1);
    }
    logger.info("Redis connection verified");

    // Start the worker
    worker = createDocumentationWorker();
    logger.info("Documentation worker started successfully");

    // Log queue stats periodically
    setInterval(async () => {
      if (!isShuttingDown) {
        try {
          const stats = await getQueueStats(QUEUE_NAMES.DOCUMENTATION_ANALYSIS);
          logger.info("Queue stats", stats);
        } catch (error) {
          logger.warn("Could not get queue stats", { error: error.message });
        }
      }
    }, 60000); // Every minute
  } catch (error) {
    logger.error("Failed to start worker", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    logger.warn("Shutdown already in progress, ignoring signal");
    return;
  }

  logger.info(`${signal} received. Starting graceful shutdown...`);
  isShuttingDown = true;

  try {
    // Close the worker (waits for active jobs to complete)
    if (worker) {
      logger.info("Closing documentation worker...");
      await closeWorker(worker);
      logger.info("Documentation worker closed");
    }

    // Close queues
    logger.info("Closing job queues...");
    await closeQueues();
    logger.info("Job queues closed");

    // Close Redis connections
    logger.info("Closing Redis connections...");
    await closeRedisConnection();
    logger.info("Redis connections closed");

    logger.info("Graceful shutdown completed successfully");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Listen for termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception in worker", {
    error: error.message,
    stack: error.stack,
  });
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Promise Rejection in worker", {
    reason: reason,
    promise: promise,
  });
});

// Start the worker
start();
