// Law: a file is read only through a read journey that shows it, by the identity that owns it, and only once attached; the
// bytes come from the private store through this controller (never a storage URL), checked against the asset object's
// size and digest before and after the transfer. Raises NOT_FOUND, INVALID_ASSET_VARIANT and ASSET_INTEGRITY_FAILED.
import type { PoolClient } from "pg";
import { readJourney } from "../local/admission.ts";
import { canonical } from "../local/effects.ts";
import type { LocalProgram } from "../local/program.ts";
import { renditionMediaType, renditionWidths } from "../media/rendition-policy.ts";
import { freezeDeep } from "../json.ts";
import { attachedFile, type AttachedFile } from "./asset-objects.ts";
import { assetDetailFacts } from "./object.ts";
import { requireAssetReference, type AssetImageVariant } from "./types.ts";
import type { AssetTransaction } from "./session.ts";
import type { PrivateImageHost } from "./host.ts";

async function authorizedFile(client: PoolClient, program: LocalProgram, actor: string, surface: string,
  runId: string, reference: string, storeId?: string): Promise<AttachedFile> {
  requireAssetReference(reference);
  const records = await readJourney(client, program, actor, surface, runId);
  // The read projects only the journey's declared fields, so a reference found here is one the actor may see; the
  // object's file column is the link (a foreign key to the asset object).
  const shown = records.some(record => Object.values(record.facts).some(value =>
    typeof value === "object" && value !== null && "kind" in value && value.kind === "asset" && value.reference === reference));
  if (!shown) throw new Error("NOT_FOUND");
  if (storeId !== undefined) {
    // The bytes are the ones this host's store holds for the asset (its staging record names the store).
    const { rows: [staged] } = await client.query(`SELECT 1 FROM desert_assets WHERE id = $1 AND actor = $2 AND store_id = $3
      AND state = 'attached'`, [reference, actor, storeId]);
    if (!staged) throw new Error("NOT_FOUND");
  }
  return attachedFile(client, program, actor, reference);
}

export function readPrivateImage(transact: AssetTransaction, program: LocalProgram, surface: string, host: PrivateImageHost,
  runId: string, reference: string, variant: AssetImageVariant, signal?: AbortSignal) {
  if (variant !== "original" && !renditionWidths.includes(variant)) throw new Error("INVALID_ASSET_VARIANT");
  return host.read(async current => {
    const inspect = () => transact((client, actor) => authorizedFile(client, program, actor, surface, runId, reference, host.store.id));
    const before = await inspect();
    const file = variant === "original" ? before.original : before.renditions.find(item => item.edge === variant);
    if (!file) throw new Error(variant === "original" || !before.renditions.length ? "INVALID_ASSET_VARIANT" : "ASSET_INTEGRITY_FAILED");
    const bytes = await host.store.read(reference, variant, file);
    if (current.aborted) throw new Error("ASSET_TRANSFER_CANCELLED");
    if (canonical(before) !== canonical(await inspect())) throw new Error("ASSET_INTEGRITY_FAILED");
    host.assertOpen();
    return { bytes, mediaType: variant === "original" ? before.mediaType : renditionMediaType };
  }, signal);
}

/** The default detail of an attached file: its asset object's detail facts, as the owner reads them. */
export async function readAssetDetail(client: PoolClient, program: LocalProgram, actor: string, surface: string,
  runId: string, reference: string) {
  const { record } = await authorizedFile(client, program, actor, surface, runId, reference);
  return freezeDeep({ id: record.id, type: record.object_type, version: record.version,
    facts: Object.fromEntries(assetDetailFacts.filter(fact => fact in record.facts).map(fact => [fact, record.facts[fact]!])) });
}
