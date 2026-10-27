-- GENERATED from src/storage/infrastructure.ts by `node scripts/storage.ts --write`. Do not edit.
CREATE SCHEMA IF NOT EXISTS "desert_execution";
CREATE TABLE IF NOT EXISTS "desert_installation" (
  "singleton" boolean NOT NULL DEFAULT true CHECK ("singleton"),
  "product_id" text NOT NULL,
  "installation_digest" text NOT NULL CHECK ("installation_digest" ~ '^[0-9a-f]{64}$'),
  "migration_chain" text[] NOT NULL,
  "infrastructure_digest" text NOT NULL CHECK ("infrastructure_digest" ~ '^[0-9a-f]{64}$'),
  "controller_roles" text[] NOT NULL,
  PRIMARY KEY ("singleton")
);
CREATE TABLE IF NOT EXISTS "desert_identities" (
  "id" uuid NOT NULL,
  "label" text NOT NULL,
  "credential_hash" text NOT NULL,
  "revoked" boolean NOT NULL DEFAULT false,
  "expires_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("credential_hash")
);
CREATE TABLE IF NOT EXISTS "desert_objects" (
  "id" uuid NOT NULL,
  "object_type" text NOT NULL,
  "version" integer NOT NULL CHECK ("version" > 0),
  "facts" jsonb NOT NULL CHECK (jsonb_typeof("facts") = 'object'),
  PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "desert_runs" (
  "id" uuid NOT NULL,
  "actor" uuid NOT NULL,
  "surface" text NOT NULL,
  "journey" text NOT NULL,
  "subject" uuid,
  "contract_digest" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "state" text NOT NULL CHECK ("state" IN ('admitted', 'prepared', 'completed')),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("actor") REFERENCES "desert_identities" ("id")
);
CREATE TABLE IF NOT EXISTS "desert_intents" (
  "id" uuid NOT NULL,
  "run_id" uuid NOT NULL,
  "input" jsonb NOT NULL,
  "effect" jsonb NOT NULL,
  "confirmation_digest" text NOT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("run_id"),
  FOREIGN KEY ("run_id") REFERENCES "desert_runs" ("id")
);
CREATE TABLE IF NOT EXISTS "desert_receipts" (
  "intent_id" uuid NOT NULL,
  "result" jsonb NOT NULL,
  "accepted_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY ("intent_id"),
  FOREIGN KEY ("intent_id") REFERENCES "desert_intents" ("id")
);
CREATE TABLE IF NOT EXISTS "desert_activities" (
  "id" uuid NOT NULL,
  "actor" uuid NOT NULL,
  "surface" text NOT NULL,
  "occurrence" uuid NOT NULL,
  "request_digest" text NOT NULL,
  "catalog_digest" text NOT NULL,
  "plan_digest" text NOT NULL,
  "plan" jsonb NOT NULL,
  "options" jsonb NOT NULL,
  "revision" integer NOT NULL CHECK ("revision" > 0),
  "answers" jsonb NOT NULL,
  "completed" jsonb NOT NULL,
  "phase" text NOT NULL CHECK ("phase" IN ('draft', 'prepared', 'completed', 'cancelled')),
  "intent_id" uuid,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY ("id"),
  UNIQUE ("actor", "surface", "occurrence"),
  FOREIGN KEY ("actor") REFERENCES "desert_identities" ("id"),
  FOREIGN KEY ("intent_id") REFERENCES "desert_intents" ("id")
);
CREATE TABLE IF NOT EXISTS "desert_activity_intents" (
  "intent_id" uuid NOT NULL,
  "activity_id" uuid NOT NULL,
  "revision" integer NOT NULL,
  PRIMARY KEY ("intent_id"),
  FOREIGN KEY ("intent_id") REFERENCES "desert_intents" ("id"),
  FOREIGN KEY ("activity_id") REFERENCES "desert_activities" ("id")
);
CREATE TABLE IF NOT EXISTS "desert_identity_accounts" (
  "identity_id" uuid NOT NULL,
  "login" text NOT NULL,
  "password_salt" text NOT NULL,
  "password_hash" text NOT NULL,
  "administrator" boolean NOT NULL DEFAULT false,
  "failed_attempts" integer NOT NULL DEFAULT 0 CHECK ("failed_attempts" >= 0),
  "blocked_until" timestamptz,
  "avatar_seed" text CHECK ("avatar_seed" ~ '^[a-f0-9]{16}$'),
  PRIMARY KEY ("identity_id"),
  UNIQUE ("login"),
  FOREIGN KEY ("identity_id") REFERENCES "desert_identities" ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "desert_single_administrator" ON "desert_identity_accounts" ("administrator") WHERE "administrator";
CREATE TABLE IF NOT EXISTS "desert_identity_sessions" (
  "credential_hash" text NOT NULL,
  "identity_id" uuid NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "revoked" boolean NOT NULL DEFAULT false,
  PRIMARY KEY ("credential_hash"),
  FOREIGN KEY ("identity_id") REFERENCES "desert_identity_accounts" ("identity_id")
);
CREATE TABLE IF NOT EXISTS "desert_asset_store" (
  "singleton" boolean NOT NULL DEFAULT true CHECK ("singleton"),
  "id" uuid NOT NULL,
  "installation" uuid NOT NULL,
  "quota" jsonb NOT NULL CHECK (jsonb_typeof("quota") = 'object'),
  PRIMARY KEY ("singleton"),
  UNIQUE ("id"),
  UNIQUE ("installation")
);
CREATE TABLE IF NOT EXISTS "desert_assets" (
  "id" uuid NOT NULL,
  "store_id" uuid NOT NULL,
  "actor" uuid NOT NULL,
  "run_id" uuid NOT NULL,
  "input_field" text NOT NULL,
  "contract_digest" text NOT NULL,
  "state" text NOT NULL CHECK ("state" IN ('reserved', 'uploading', 'ready', 'failed', 'attached')),
  "declared_size" integer NOT NULL CHECK ("declared_size" > 0),
  "reserved_bytes" bigint NOT NULL CHECK ("reserved_bytes" > 0),
  "metadata" jsonb,
  PRIMARY KEY ("id"),
  UNIQUE ("run_id", "input_field"),
  FOREIGN KEY ("store_id") REFERENCES "desert_asset_store" ("id"),
  FOREIGN KEY ("actor") REFERENCES "desert_identities" ("id"),
  FOREIGN KEY ("run_id") REFERENCES "desert_runs" ("id")
);
CREATE TABLE IF NOT EXISTS "desert_asset_links" (
  "asset_id" uuid NOT NULL,
  "object_id" uuid NOT NULL,
  "field" text NOT NULL,
  PRIMARY KEY ("asset_id", "object_id", "field"),
  FOREIGN KEY ("asset_id") REFERENCES "desert_assets" ("id"),
  FOREIGN KEY ("object_id") REFERENCES "desert_objects" ("id")
);
CREATE TABLE IF NOT EXISTS "desert_execution"."installation" (
  "singleton" boolean NOT NULL CHECK ("singleton"),
  "version" integer NOT NULL,
  PRIMARY KEY ("singleton")
);
CREATE TABLE IF NOT EXISTS "desert_execution"."environments" (
  "id" uuid NOT NULL,
  "name" text NOT NULL,
  "label" text NOT NULL,
  PRIMARY KEY ("id"),
  UNIQUE ("name")
);
CREATE TABLE IF NOT EXISTS "desert_execution"."actors" (
  "id" uuid NOT NULL,
  "environment_id" uuid NOT NULL,
  "name" text NOT NULL,
  "label" text NOT NULL,
  "adapter_digest" text NOT NULL,
  "concurrency" integer NOT NULL CHECK ("concurrency" BETWEEN 1 AND 32),
  PRIMARY KEY ("id"),
  UNIQUE ("environment_id", "name"),
  FOREIGN KEY ("environment_id") REFERENCES "desert_execution"."environments" ("id")
);
CREATE TABLE IF NOT EXISTS "desert_execution"."jobs" (
  "id" uuid NOT NULL,
  "sequence" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "actor_id" uuid NOT NULL,
  "submission_key" text NOT NULL,
  "input" jsonb NOT NULL,
  "input_digest" text NOT NULL,
  "state" text NOT NULL CHECK ("state" IN ('queued', 'leased', 'running', 'succeeded', 'failed', 'cancelled', 'uncertain')),
  "cancel_requested" boolean NOT NULL DEFAULT false,
  "claim_token" uuid,
  "lease_until" timestamptz,
  "reason" text,
  "result" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY ("id"),
  UNIQUE ("sequence"),
  UNIQUE ("actor_id", "submission_key"),
  FOREIGN KEY ("actor_id") REFERENCES "desert_execution"."actors" ("id")
);
CREATE INDEX IF NOT EXISTS "jobs_by_actor_state" ON "desert_execution"."jobs" ("actor_id", "state", "sequence");
CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA "public";
CREATE OR REPLACE FUNCTION "public"."desert_search_key"(value text) RETURNS text
  LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT lower("public"."unaccent"('public.unaccent'::regdictionary, value))
$$;
