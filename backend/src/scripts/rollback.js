import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../config/database.js";
import { logger } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the last applied migration
async function getLastMigration() {
  const result = await pool.query(
    "SELECT migration_name FROM schema_migrations ORDER BY applied_at DESC LIMIT 1"
  );
  return result.rows[0];
}

// Rollback the last migration
async function rollback() {
  const migrationsDir = path.join(__dirname, "../../migrations");

  try {
    logger.info("🔄 Rolling back last migration...");

    // Get the last applied migration
    const lastMigration = await getLastMigration();

    if (!lastMigration) {
      logger.info("No migrations to rollback");
      process.exit(0);
    }

    const migrationName = lastMigration.migration_name;
    logger.info(`Found last migration: ${migrationName}`);

    // Look for corresponding rollback file
    const rollbackFile = `${migrationName}.down.sql`;
    const rollbackPath = path.join(migrationsDir, rollbackFile);

    if (!fs.existsSync(rollbackPath)) {
      logger.warn(`⚠️  No rollback file found: ${rollbackFile}`);
      logger.warn("Manual rollback required. Remove the migration record with:");
      logger.warn(`DELETE FROM schema_migrations WHERE migration_name = '${migrationName}';`);
      process.exit(1);
    }

    // Read and execute rollback SQL
    const sql = fs.readFileSync(rollbackPath, "utf8");
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      logger.info(`▶️  Running rollback: ${rollbackFile}`);
      await client.query(sql);

      // Remove migration record
      await client.query("DELETE FROM schema_migrations WHERE migration_name = $1", [
        migrationName,
      ]);

      await client.query("COMMIT");
      logger.info(`✅ Successfully rolled back: ${migrationName}`);
      process.exit(0);
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(`❌ Rollback failed: ${migrationName}`, error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error("❌ Rollback process failed:", error);
    process.exit(1);
  }
}

rollback();
