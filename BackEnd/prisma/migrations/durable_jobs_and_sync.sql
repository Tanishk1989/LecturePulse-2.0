CREATE TABLE IF NOT EXISTS processing_jobs (
  lecture_id TEXT PRIMARY KEY REFERENCES lectures(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '{}',
  state TEXT NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','running','completed','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lease_until TIMESTAMPTZ,
  lease_token TEXT,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS processing_jobs_ready_idx ON processing_jobs(state, available_at);
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON processing_jobs FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS user_sync_documents (
  user_id TEXT NOT NULL,
  document_key TEXT NOT NULL,
  data JSONB NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, document_key)
);
ALTER TABLE user_sync_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON user_sync_documents FROM PUBLIC, anon, authenticated;
