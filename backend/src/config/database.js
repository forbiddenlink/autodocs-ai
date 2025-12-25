import pg from "pg";
import dotenv from "dotenv";
import { logger } from "../utils/logger.js";

const { Pool } = pg;

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test the connection
pool.on("connect", () => {
  logger.info("✅ Database connection established");
});

pool.on("error", (err) => {
  logger.error("❌ Unexpected database error:", err);
  process.exit(-1);
});

export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug(`Executed query: ${text} (${duration}ms)`);
    return res;
  } catch (error) {
    logger.error(`Query error: ${error.message}`);
    throw error;
  }
};

export const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);

  // Set a timeout of 5 seconds
  const timeout = setTimeout(() => {
    logger.error("A client has been checked out for more than 5 seconds!");
  }, 5000);

  // Monkey patch the release method to clear timeout
  client.release = () => {
    clearTimeout(timeout);
    return release();
  };

  return client;
};

export default pool;
