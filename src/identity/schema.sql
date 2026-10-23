CREATE TABLE IF NOT EXISTS desert_identity_accounts (
  identity_id uuid PRIMARY KEY REFERENCES desert_identities(id),
  login text NOT NULL UNIQUE,
  password_salt text NOT NULL,
  password_hash text NOT NULL,
  administrator boolean NOT NULL DEFAULT false,
  failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  blocked_until timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS desert_single_administrator
  ON desert_identity_accounts (administrator) WHERE administrator;
ALTER TABLE desert_identity_accounts ADD COLUMN IF NOT EXISTS avatar_seed text
  CHECK (avatar_seed ~ '^[a-f0-9]{16}$');
CREATE TABLE IF NOT EXISTS desert_identity_sessions (
  credential_hash text PRIMARY KEY,
  identity_id uuid NOT NULL REFERENCES desert_identity_accounts(identity_id),
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false
);
