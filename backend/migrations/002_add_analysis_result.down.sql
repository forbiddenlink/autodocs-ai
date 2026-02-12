-- Rollback: Remove added columns

ALTER TABLE analysis_jobs DROP COLUMN IF EXISTS result;
ALTER TABLE repositories DROP COLUMN IF EXISTS description;
ALTER TABLE repositories DROP COLUMN IF EXISTS last_analysis_error;
ALTER TABLE repositories DROP COLUMN IF EXISTS last_analyzed_at;

DROP INDEX IF EXISTS idx_documents_type;
DROP INDEX IF EXISTS idx_documents_updated_at;
