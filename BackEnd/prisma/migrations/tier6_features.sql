-- Tier 6: collaborative notes sharing
CREATE TABLE IF NOT EXISTS lecture_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  share_token TEXT NOT NULL UNIQUE,
  allow_merge BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lecture_shares_lecture_id ON lecture_shares(lecture_id);
CREATE INDEX IF NOT EXISTS idx_lecture_shares_token ON lecture_shares(share_token);
