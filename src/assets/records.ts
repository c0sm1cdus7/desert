import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { Run } from "../local/types.ts";
import { requirePrivateAssetInstallation } from "./installation.ts";
import { assetReservationBytes } from "./policy.ts";
import { requireAssetReference, type PrivateAssetMetadata } from "./types.ts";

export type AssetScope = Readonly<{ actor: string; surface: string; runId: string; inputField: string; contractDigest: string; storeId: string; media?:"image"|"media" }>;
export type AssetRecord = {
  id: string; actor: string; run_id: string; input_field: string; contract_digest: string; store_id: string;
  state: "reserved" | "uploading" | "ready" | "failed" | "attached";
  declared_size: number; reserved_bytes: string; metadata: PrivateAssetMetadata | null;
};

export async function requireAssetRun(client: PoolClient, scope: AssetScope, state: Run["state"] = "admitted") {
  requireAssetReference(scope.runId); requireAssetReference(scope.actor);
  if (typeof scope.inputField !== "string" || !scope.inputField.length || scope.inputField.length > 256) throw new Error("INVALID_ASSET_INPUT");
  const { rows: [run] } = await client.query<Run>(
    "SELECT * FROM desert_runs WHERE id = $1 AND actor = $2 AND surface = $3 FOR UPDATE", [scope.runId, scope.actor, scope.surface]);
  if (!run) throw new Error("NOT_FOUND");
  if (run.contract_digest !== scope.contractDigest) throw new Error("CONTRACT_MISMATCH");
  if (run.state !== state) throw new Error("INVALID_RUN_STATE");
  const { rows: [clock] } = await client.query("SELECT clock_timestamp() AS time");
  if (run.expires_at <= clock.time) throw new Error("RUN_EXPIRED");
  return run;
}
export async function reservePrivateAsset(client: PoolClient, scope: AssetScope, declaredSize: number) {
  const reservedBytes = assetReservationBytes(declaredSize);
  await requireAssetRun(client, scope);
  const quota = await requirePrivateAssetInstallation(client, scope.storeId, undefined, true);
  const { rows: [existing] } = await client.query<AssetRecord>(
    "SELECT * FROM desert_assets WHERE run_id = $1 AND input_field = $2", [scope.runId, scope.inputField]);
  if (existing) {
    if (existing.declared_size !== declaredSize) throw new Error("ASSET_RESERVATION_CONFLICT");
    return existing;
  }
  const { rows: [usage] } = await client.query<{ bytes: string; count: string; identity_bytes: string; identity_count: string }>(
    `SELECT COALESCE(SUM(reserved_bytes), 0) AS bytes, COUNT(*) AS count,
      COALESCE(SUM(reserved_bytes) FILTER (WHERE actor = $1), 0) AS identity_bytes,
      COUNT(*) FILTER (WHERE actor = $1) AS identity_count FROM desert_assets`, [scope.actor]);
  if (Number(usage!.count) >= quota.totalAssets || Number(usage!.bytes) + reservedBytes > quota.totalBytes ||
    Number(usage!.identity_count) >= quota.identityAssets || Number(usage!.identity_bytes) + reservedBytes > quota.identityBytes) {
    throw new Error("ASSET_QUOTA_EXCEEDED");
  }
  const { rows: [row] } = await client.query<AssetRecord>(`INSERT INTO desert_assets
    (id, store_id, actor, run_id, input_field, contract_digest, state, declared_size, reserved_bytes)
    VALUES ($1,$2,$3,$4,$5,$6,'reserved',$7,$8) RETURNING *`,
  [randomUUID(), scope.storeId, scope.actor, scope.runId, scope.inputField, scope.contractDigest, declaredSize, reservedBytes]);
  return row!;
}
export async function privateAssetRecord(client: PoolClient, scope: AssetScope, reference: string) {
  requireAssetReference(reference);
  const { rows: [row] } = await client.query<AssetRecord>(`SELECT * FROM desert_assets WHERE id = $1 AND actor = $2
    AND run_id = $3 AND input_field = $4 AND contract_digest = $5 AND store_id = $6 FOR UPDATE`,
  [reference, scope.actor, scope.runId, scope.inputField, scope.contractDigest, scope.storeId]);
  if (!row) throw new Error("NOT_FOUND");
  return row;
}
