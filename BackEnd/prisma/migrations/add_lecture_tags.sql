-- Add tags column to lectures (JSON array of strings)
ALTER TABLE lectures ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb;
