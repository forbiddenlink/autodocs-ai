import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../config/database.js";
import { logger } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create migrations tracking table if it doesn't exist
async function createMigrationsTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      checksum VARCHAR(64),
      execution_time_ms INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_schema_migrations_name ON schema_migrations(migration_name);
  `;

  await pool.query(createTableSQL);
  logger.info("✅ Migrations tracking table ready");
}

// Calculate simple checksum for migration file
function calculateChecksum(content) {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

// Get list of already applied migrations
async function getAppliedMigrations() {
  const result = await pool.query(
    "SELECT migration_name, checksum FROM schema_migrations ORDER BY migration_name"
  );
  return result.rows;
}

// Run migrations
async function runMigrations() {
  const migrationsDir = path.join(__dirname, "../../migrations");

  try {
    logger.info("🔄 Running database migrations...");

    // Ensure migrations table exists
    await createMigrationsTable();

    // Get list of applied migrations
    const appliedMigrations = await getAppliedMigrations();
    const appliedNames = new Set(appliedMigrations.map((m) => m.migration_name));

    // Get all migration files
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      logger.info("No migration files found");
      process.exit(0);
    }

    logger.info(`Found ${files.length} migration files, ${appliedNames.size} already applied`);

    // Run each pending migration
    let appliedCount = 0;
    for (const file of files) {
      const migrationName = file.replace(".sql", "");

      // Skip if already applied
      if (appliedNames.has(migrationName)) {
        logger.info(`⏭️  Skipping (already applied): ${file}`);
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf8");
      const checksum = calculateChecksum(sql);

      logger.info(`▶️  Running migration: ${file}`);

      const startTime = Date.now();
      const client = await pool.connect();

      try {
        // Run migration in transaction
        await client.query("BEGIN");
        await client.query(sql);

        // Record migration
        const executionTime = Date.now() - startTime;
        await client.query(
          "INSERT INTO schema_migrations (migration_name, checksum, execution_time_ms) VALUES ($1, $2, $3)",
          [migrationName, checksum, executionTime]
        );

        await client.query("COMMIT");
        logger.info(`✅ Completed: ${file} (${executionTime}ms)`);
        appliedCount++;
      } catch (error) {
        await client.query("ROLLBACK");
        logger.error(`❌ Migration failed: ${file}`, error);
        throw error;
      } finally {
        client.release();
      }
    }

    if (appliedCount === 0) {
      logger.info("✅ All migrations already applied - database is up to date");
    } else {
      logger.info(`✅ Successfully applied ${appliedCount} new migration(s)`);
    }

    process.exit(0);
  } catch (error) {
    logger.error("❌ Migration process failed:", error);
    process.exit(1);
  }
}

runMigrations();
