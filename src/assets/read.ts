import type { PoolClient } from "pg";
import { readJourney } from "../local/admission.ts";
import { canonical } from "../local/effects.ts";
import type { LocalProgram } from "../local/program.ts";
import { assetMediaKind, requireAssetReference, type AssetImageVariant, type PrivateAssetMetadata } from "./types.ts";
import type { AssetTransaction } from "./session.ts";
import type { PrivateImageHost } from "./host.ts";
import { renditionWidths } from "../media/rendition-policy.ts";

async function authorizedImage(client: PoolClient, program: LocalProgram, actor: string, surface: string,
  storeId: string, runId: string, reference: string) {
  requireAssetReference(reference);
  const records = await readJourney(client, program, actor, surface, runId);
  for (const record of records) for (const [field, value] of Object.entries(record.facts)) {
    if (typeof value !== "object" || !value || !("kind" in value) || value.kind !== "asset" || value.reference !== reference) continue;
    const { rows: [asset] } = await client.query<{ metadata: PrivateAssetMetadata }>(`SELECT a.metadata FROM desert_assets a
      JOIN desert_asset_links l ON l.asset_id = a.id
      WHERE a.id = $1 AND a.actor = $2 AND a.store_id = $3 AND a.state = 'attached' AND l.object_id = $4 AND l.field = $5`,
    [reference, actor, storeId, record.id, field]);
    if (asset?.metadata) return asset.metadata;
  }
  throw new Error("NOT_FOUND");
}

export function readPrivateImage(transact: AssetTransaction, program: LocalProgram, surface: string, host: PrivateImageHost,
  runId: string, reference: string, variant: AssetImageVariant, signal?: AbortSignal) {
  if (variant !== "original" && !renditionWidths.includes(variant)) throw new Error("INVALID_ASSET_VARIANT");
  return host.read(async current => {
    const inspect = () => transact((client, actor) => authorizedImage(client, program, actor, surface, host.store.id, runId, reference));
    const before = await inspect();
    if (variant !== "original" && assetMediaKind(before) !== "image") throw new Error("INVALID_ASSET_VARIANT");
    const file = variant === "original" ? before.original : before.renditions.find(item => item.edge === variant);
    if (!file) throw new Error("ASSET_INTEGRITY_FAILED");
    const bytes = await host.store.read(reference, variant, file);
    if (current.aborted) throw new Error("ASSET_TRANSFER_CANCELLED");
    if (canonical(before) !== canonical(await inspect())) throw new Error("ASSET_INTEGRITY_FAILED");
    host.assertOpen();
    return { bytes, mediaType: variant === "original" ? before.mediaType : "image/webp" };
  }, signal);
}
