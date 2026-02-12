import IORedis from "ioredis";
import { logger } from "../utils/logger.js";

/**
 * Redis connection configuration for BullMQ
 */
const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false, // Required for BullMQ
};

// Optional TLS configuration for production
if (process.env.REDIS_TLS === "true") {
  redisConfig.tls = {};
}

let connection = null;

/**
 * Get or create a shared Redis connection
 * @returns {IORedis}
 */
export function getRedisConnection() {
  if (!connection) {
    connection = new IORedis(redisConfig);

    connection.on("connect", () => {
      logger.info("Redis connection established", {
        host: redisConfig.host,
        port: redisConfig.port,
      });
    });

    connection.on("error", (err) => {
      logger.error("Redis connection error", {
        error: err.message,
        host: redisConfig.host,
        port: redisConfig.port,
      });
    });

    connection.on("close", () => {
      logger.warn("Redis connection closed");
    });
  }

  return connection;
}

/**
 * Create a new Redis connection (for workers that need dedicated connections)
 * @returns {IORedis}
 */
export function createRedisConnection() {
  const conn = new IORedis(redisConfig);

  conn.on("error", (err) => {
    logger.error("Redis connection error", {
      error: err.message,
    });
  });

  return conn;
}

/**
 * Get Redis configuration object for BullMQ
 */
export function getRedisConfig() {
  return redisConfig;
}

/**
 * Check Redis health
 * @returns {Promise<{status: string, error?: string}>}
 */
export async function checkRedisHealth() {
  try {
    const conn = getRedisConnection();
    const result = await conn.ping();
    return {
      status: result === "PONG" ? "healthy" : "unhealthy",
    };
  } catch (error) {
    return {
      status: "unhealthy",
      error: error.message,
    };
  }
}

/**
 * Close Redis connections gracefully
 */
export async function closeRedisConnection() {
  if (connection) {
    await connection.quit();
    connection = null;
    logger.info("Redis connection closed gracefully");
  }
}

export default {
  getRedisConnection,
  createRedisConnection,
  getRedisConfig,
  checkRedisHealth,
  closeRedisConnection,
};
