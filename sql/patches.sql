-- Incremental patches for existing databases (safe to re-run)

ALTER TABLE cashier_balancing ALTER COLUMN manager_id DROP NOT NULL;

ALTER TABLE cashier_balancing
  ADD COLUMN IF NOT EXISTS agent_submitted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS revoked_tokens (
  jti         VARCHAR(64) PRIMARY KEY,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON revoked_tokens(expires_at);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(128) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;

-- Allow rejected cashier balance status
ALTER TABLE cashier_balancing DROP CONSTRAINT IF EXISTS cashier_balancing_status_check;
ALTER TABLE cashier_balancing ADD CONSTRAINT cashier_balancing_status_check
  CHECK (status IN ('pending', 'approved', 'flagged', 'rejected'));
