-- Add result column to analysis_jobs table
-- This stores the JSON result of the analysis

ALTER TABLE analysis_jobs ADD COLUMN IF NOT EXISTS result JSONB;

-- Add description column to repositories table
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS description TEXT;

-- Add last_analysis_error column to repositories table
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS last_analysis_error TEXT;

-- Add last_analyzed_at column to repositories table
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMP;

-- Add index for faster document queries
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at DESC);

-- Update analysis_jobs status enum comment
COMMENT ON COLUMN analysis_jobs.status IS 'Job status: queued, processing, completed, failed';
