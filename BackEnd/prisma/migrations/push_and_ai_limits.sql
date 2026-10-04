CREATE TABLE IF NOT EXISTS server_secrets (name TEXT PRIMARY KEY, value JSONB NOT NULL);
ALTER TABLE server_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON server_secrets FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS ai_limit_buckets (scope TEXT PRIMARY KEY, minute BIGINT NOT NULL, minute_count INTEGER NOT NULL DEFAULT 0, day BIGINT NOT NULL, day_count INTEGER NOT NULL DEFAULT 0);
ALTER TABLE ai_limit_buckets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ai_limit_buckets FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS ai_limit_leases (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL);
CREATE INDEX IF NOT EXISTS ai_limit_leases_user_idx ON ai_limit_leases(user_id,expires_at);
CREATE INDEX IF NOT EXISTS ai_limit_leases_expiry_idx ON ai_limit_leases(expires_at);
ALTER TABLE ai_limit_leases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ai_limit_leases FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_id);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON push_subscriptions FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS push_deliveries (
  subscription_id TEXT NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL, user_id TEXT NOT NULL, payload JSONB NOT NULL,
  state TEXT NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','running','sent','failed')),
  attempts INTEGER NOT NULL DEFAULT 0, available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lease_token TEXT, lease_until TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(subscription_id,event_key)
);
CREATE INDEX IF NOT EXISTS push_deliveries_ready_idx ON push_deliveries(state,available_at);
ALTER TABLE push_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON push_deliveries FROM PUBLIC, anon, authenticated;
