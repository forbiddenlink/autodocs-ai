# Database Migrations Guide

## Overview

AutoDocs AI uses a custom migration system to manage database schema changes. All migrations are version-controlled in Git and can be applied incrementally or rolled back.

## Migration Files

Migrations are stored in `backend/migrations/` directory with the following naming convention:

```
XXX_description.sql         # Migration file
XXX_description.down.sql    # Rollback file (optional)
```

Where `XXX` is a three-digit sequence number (e.g., 001, 002, 003).

## Migration Tracking

The system automatically tracks applied migrations in the `schema_migrations` table:

```sql
CREATE TABLE schema_migrations (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  checksum VARCHAR(64),
  execution_time_ms INTEGER
);
```

**Features:**

- ✅ Tracks which migrations have been applied
- ✅ Stores checksums to detect file modifications
- ✅ Records execution time for performance monitoring
- ✅ Prevents duplicate migrations
- ✅ Transaction-based execution (all or nothing)

## Running Migrations

### Apply All Pending Migrations

```bash
cd backend
npm run migrate
```

This command:

1. Creates the `schema_migrations` tracking table if needed
2. Checks which migrations have already been applied
3. Runs pending migrations in order
4. Records each successful migration
5. Rolls back on error

**Example Output:**

```
🔄 Running database migrations...
✅ Migrations tracking table ready
Found 3 migration files, 1 already applied
⏭️  Skipping (already applied): 001_initial_schema.sql
▶️  Running migration: 002_add_user_preferences.sql
✅ Completed: 002_add_user_preferences.sql (145ms)
▶️  Running migration: 003_add_repo_settings.sql
✅ Completed: 003_add_repo_settings.sql (89ms)
✅ Successfully applied 2 new migration(s)
```

### Check Migration Status

```bash
# List all migrations
ls -1 backend/migrations/*.sql

# Check applied migrations in database
psql autodocs_dev -c "SELECT migration_name, applied_at, execution_time_ms FROM schema_migrations ORDER BY applied_at;"
```

## Rolling Back Migrations

### Rollback Last Migration

```bash
cd backend
npm run migrate:rollback
```

This command:

1. Finds the last applied migration
2. Looks for the corresponding `.down.sql` file
3. Executes the rollback SQL in a transaction
4. Removes the migration record from tracking table

**Example Output:**

```
🔄 Rolling back last migration...
Found last migration: 003_add_repo_settings
▶️  Running rollback: 003_add_repo_settings.down.sql
✅ Successfully rolled back: 003_add_repo_settings
```

**Note:** If no rollback file exists, you'll need to manually rollback:

```sql
-- Manually reverse the migration changes
-- Then remove the tracking record:
DELETE FROM schema_migrations WHERE migration_name = 'XXX_migration_name';
```

## Creating New Migrations

### Step 1: Create Migration File

Create a new file in `backend/migrations/` with the next sequence number:

```bash
# Example: 002_add_user_preferences.sql
```

```sql
-- Add user preferences table
CREATE TABLE user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light',
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```

### Step 2: Create Rollback File (Recommended)

Create the corresponding `.down.sql` file:

```bash
# Example: 002_add_user_preferences.down.sql
```

```sql
-- Rollback user preferences table
DROP INDEX IF EXISTS idx_user_preferences_user_id;
DROP TABLE IF EXISTS user_preferences CASCADE;
```

### Step 3: Test the Migration

```bash
# Apply migration
npm run migrate

# Verify schema
psql autodocs_dev -c "\d user_preferences"

# Test rollback (optional)
npm run migrate:rollback

# Re-apply if rollback worked
npm run migrate
```

### Step 4: Commit to Git

```bash
git add backend/migrations/002_add_user_preferences.sql
git add backend/migrations/002_add_user_preferences.down.sql
git commit -m "Add user preferences migration"
```

## Best Practices

### ✅ DO

- **Number sequentially**: Use 001, 002, 003, etc.
- **Descriptive names**: `003_add_email_verification.sql` not `003_changes.sql`
- **Include rollbacks**: Create `.down.sql` files for all migrations
- **Test both ways**: Test both migration and rollback
- **Use transactions**: Migrations run in transactions automatically
- **Version control**: Always commit migration files to Git
- **Idempotent operations**: Use `IF NOT EXISTS` and `IF EXISTS` when possible

### ❌ DON'T

- **Modify existing migrations**: Once applied, never change migration files
- **Skip numbers**: Keep sequence continuous (001, 002, 003)
- **Mix changes**: One migration = one logical change
- **Break dependencies**: Consider foreign keys and order of operations
- **Forget indexes**: Add indexes for foreign keys and frequently queried columns

## Migration Environments

### Development

```bash
# Local development database
DATABASE_URL=postgresql://localhost/autodocs_dev npm run migrate
```

### Staging

```bash
# Staging database (example)
DATABASE_URL=postgresql://user:pass@staging-db:5432/autodocs npm run migrate
```

### Production

```bash
# Production database (example)
DATABASE_URL=postgresql://user:pass@prod-db:5432/autodocs npm run migrate
```

**Important:** Always test migrations in development and staging before production!

## Troubleshooting

### Migration Failed Mid-Execution

Migrations run in transactions, so a failed migration automatically rolls back:

```bash
❌ Migration failed: 003_add_repo_settings.sql
```

**Solution:**

1. Fix the SQL syntax error in the migration file
2. Run migrations again (failed migration won't be recorded)

### Migration Applied But Schema Wrong

If you need to modify an already-applied migration:

```bash
# 1. Rollback the migration
npm run migrate:rollback

# 2. Edit the migration file
# 3. Re-apply
npm run migrate
```

**Note:** In production, create a new migration instead!

### Check Migration Status

```sql
-- See all applied migrations
SELECT * FROM schema_migrations ORDER BY applied_at DESC;

-- See pending migrations
-- Compare file list with database records
```

## Architecture

### Files Structure

```
backend/
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 001_initial_schema.down.sql
│   ├── 002_add_user_preferences.sql
│   └── 002_add_user_preferences.down.sql
└── src/
    └── scripts/
        ├── migrate.js      # Migration runner
        └── rollback.js     # Rollback runner
```

### How It Works

1. **Migration Runner** (`migrate.js`):
   - Reads all `.sql` files from migrations directory
   - Sorts them alphabetically (001, 002, 003)
   - Checks `schema_migrations` table for applied migrations
   - Runs pending migrations in transactions
   - Records successful migrations with checksums

2. **Rollback Runner** (`rollback.js`):
   - Finds last applied migration from `schema_migrations`
   - Looks for corresponding `.down.sql` file
   - Executes rollback in transaction
   - Removes migration record from tracking table

3. **Tracking Table** (`schema_migrations`):
   - Automatically created on first migration
   - Stores migration name, timestamp, checksum, and execution time
   - Prevents duplicate migrations
   - Enables rollback functionality

## CI/CD Integration

### Example GitHub Actions Workflow

```yaml
name: Deploy

jobs:
  deploy:
    steps:
      - name: Run Migrations
        run: |
          npm run migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Pre-deployment Checklist

- [ ] Migrations tested in development
- [ ] Migrations tested in staging
- [ ] Rollback files created and tested
- [ ] Team notified of schema changes
- [ ] Database backup taken (production)
- [ ] Migrations committed to Git

## Summary

✅ **Version Controlled**: All migrations in Git
✅ **Numbered/Timestamped**: Sequential numbering (001, 002, 003)
✅ **Rollback Capable**: `.down.sql` files for each migration
✅ **Tracking**: `schema_migrations` table tracks applied migrations
✅ **Transactional**: All-or-nothing execution
✅ **Idempotent**: Safe to run multiple times
✅ **Production-Ready**: Used in staging and production environments

---

**For more information, see:**

- [Database Configuration](backend/src/config/database.js)
- [Migration Script](backend/src/scripts/migrate.js)
- [Rollback Script](backend/src/scripts/rollback.js)
