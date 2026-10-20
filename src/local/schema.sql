CREATE TABLE IF NOT EXISTS desert_installation (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  schema_version integer NOT NULL,
  product_id text NOT NULL,
  contract_digest text NOT NULL,
  controller_role text NOT NULL
);
CREATE TABLE IF NOT EXISTS desert_identities (
  id uuid PRIMARY KEY,
  label text NOT NULL,
  credential_hash text NOT NULL UNIQUE,
  revoked boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS desert_objects (
  id uuid PRIMARY KEY,
  object_type text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  facts jsonb NOT NULL CHECK (jsonb_typeof(facts) = 'object')
);
CREATE TABLE IF NOT EXISTS desert_runs (
  id uuid PRIMARY KEY,
  actor uuid NOT NULL REFERENCES desert_identities(id),
  surface text NOT NULL,
  journey text NOT NULL,
  subject uuid,
  contract_digest text NOT NULL,
  expires_at timestamptz NOT NULL,
  state text NOT NULL CHECK (state IN ('admitted', 'prepared', 'completed'))
);
CREATE TABLE IF NOT EXISTS desert_intents (
  id uuid PRIMARY KEY,
  run_id uuid NOT NULL UNIQUE REFERENCES desert_runs(id),
  input jsonb NOT NULL,
  effect jsonb NOT NULL,
  confirmation_digest text NOT NULL
);
CREATE TABLE IF NOT EXISTS desert_receipts (
  intent_id uuid PRIMARY KEY REFERENCES desert_intents(id),
  result jsonb NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
