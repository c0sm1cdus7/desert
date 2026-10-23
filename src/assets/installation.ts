import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { requireAssetQuota, type AssetQuota } from "./policy.ts";
import { requireAssetReference } from "./types.ts";

export async function installPrivateAssetStore(client: PoolClient, id: string, limits: AssetQuota) {
  requireAssetReference(id);
  const quota = requireAssetQuota(limits);
  await client.query("SELECT pg_advisory_xact_lock(842722)");
  await client.query(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
  await client.query("INSERT INTO desert_asset_store (singleton, id, installation, quota) VALUES (true, $1, $2, $3) ON CONFLICT DO NOTHING",
    [id, randomUUID(), quota]);
  await requirePrivateAssetInstallation(client, id, quota);
  const { rows: [row] } = await client.query<{ installation: string }>("SELECT installation FROM desert_asset_store WHERE id = $1", [id]);
  return row!.installation;
}
export async function requirePrivateAssetInstallation(client: PoolClient, id: string, quota?: AssetQuota, lock = false) {
  const { rows: [row] } = await client.query<{ id: string; quota: AssetQuota }>(
    `SELECT id, quota FROM desert_asset_store${lock ? " FOR UPDATE" : ""}`);
  if (!row || row.id !== id) throw new Error("ASSET_STORE_MISMATCH");
  const installed = requireAssetQuota(row.quota);
  if (quota && Object.keys(installed).some(key => installed[key as keyof AssetQuota] !== quota[key as keyof AssetQuota])) {
    throw new Error("ASSET_QUOTA_MISMATCH");
  }
  return installed;
}
