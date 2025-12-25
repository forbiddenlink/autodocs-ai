-- Rollback script for initial schema

-- Drop triggers first
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
DROP TRIGGER IF EXISTS update_repositories_updated_at ON repositories;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_webhooks_repo_id;
DROP INDEX IF EXISTS idx_chat_messages_user_id;
DROP INDEX IF EXISTS idx_chat_messages_repo_id;
DROP INDEX IF EXISTS idx_analysis_jobs_repo_id;
DROP INDEX IF EXISTS idx_documents_repo_id;
DROP INDEX IF EXISTS idx_repositories_user_id;

-- Drop tables (in reverse order of dependencies)
DROP TABLE IF EXISTS webhooks CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS analysis_jobs CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS repositories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
