CREATE SCHEMA IF NOT EXISTS desert_execution;
CREATE TABLE IF NOT EXISTS desert_execution.installation (
  singleton boolean PRIMARY KEY CHECK (singleton), version integer NOT NULL
);
CREATE TABLE IF NOT EXISTS desert_execution.environments (
  id uuid PRIMARY KEY, name text UNIQUE NOT NULL, label text NOT NULL
);
CREATE TABLE IF NOT EXISTS desert_execution.actors (
  id uuid PRIMARY KEY, environment_id uuid NOT NULL REFERENCES desert_execution.environments(id),
  name text NOT NULL, label text NOT NULL, adapter_digest text NOT NULL,
  concurrency integer NOT NULL CHECK (concurrency BETWEEN 1 AND 32),
  UNIQUE (environment_id, name)
);
CREATE TABLE IF NOT EXISTS desert_execution.jobs (
  id uuid PRIMARY KEY, sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  actor_id uuid NOT NULL REFERENCES desert_execution.actors(id), submission_key text NOT NULL,
  input jsonb NOT NULL, input_digest text NOT NULL, state text NOT NULL,
  cancel_requested boolean NOT NULL DEFAULT false, claim_token uuid, lease_until timestamptz,
  reason text, result jsonb, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (actor_id, submission_key),
  CHECK (state IN ('queued', 'leased', 'running', 'succeeded', 'failed', 'cancelled', 'uncertain'))
);
CREATE INDEX IF NOT EXISTS jobs_by_actor_state ON desert_execution.jobs(actor_id, state, sequence);
