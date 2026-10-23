CREATE TABLE IF NOT EXISTS desert_activities (
  id uuid PRIMARY KEY,
  actor uuid NOT NULL REFERENCES desert_identities(id),
  surface text NOT NULL,
  occurrence uuid NOT NULL,
  request_digest text NOT NULL,
  catalog_digest text NOT NULL,
  plan_digest text NOT NULL,
  plan jsonb NOT NULL,
  options jsonb NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  answers jsonb NOT NULL,
  completed jsonb NOT NULL,
  phase text NOT NULL CHECK (phase IN ('draft', 'prepared', 'completed', 'cancelled')),
  intent_id uuid REFERENCES desert_intents(id),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (actor, surface, occurrence)
);
CREATE TABLE IF NOT EXISTS desert_activity_intents (
  intent_id uuid PRIMARY KEY REFERENCES desert_intents(id),
  activity_id uuid NOT NULL REFERENCES desert_activities(id),
  revision integer NOT NULL
);
