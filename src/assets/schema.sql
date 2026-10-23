CREATE TABLE IF NOT EXISTS desert_asset_store (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  id uuid NOT NULL UNIQUE,
  installation uuid NOT NULL UNIQUE,
  quota jsonb NOT NULL CHECK (jsonb_typeof(quota) = 'object')
);
CREATE TABLE IF NOT EXISTS desert_assets (
  id uuid PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES desert_asset_store(id),
  actor uuid NOT NULL REFERENCES desert_identities(id),
  run_id uuid NOT NULL REFERENCES desert_runs(id),
  input_field text NOT NULL,
  contract_digest text NOT NULL,
  state text NOT NULL CHECK (state IN ('reserved', 'uploading', 'ready', 'failed', 'attached')),
  declared_size integer NOT NULL CHECK (declared_size > 0),
  reserved_bytes bigint NOT NULL CHECK (reserved_bytes > 0),
  metadata jsonb,
  UNIQUE (run_id, input_field)
);
CREATE TABLE IF NOT EXISTS desert_asset_links (
  asset_id uuid NOT NULL REFERENCES desert_assets(id),
  object_id uuid NOT NULL REFERENCES desert_objects(id),
  field text NOT NULL,
  PRIMARY KEY (asset_id, object_id, field)
);
