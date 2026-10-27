import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { loadDefinition } from "../compiled-definition.ts";
import { canonical } from "../local/effects.ts";
import type { Effect, Facts, Mutation, Run } from "../local/types.ts";
import type { LocalProgram } from "../local/program.ts";
import { acceptsOnlyImages } from "../media/rendition-policy.ts";
import { attachAssetObjects } from "./asset-objects.ts";
import { privateAssetRecord } from "./records.ts";
import { assetMediaKind, type AssetEvidence } from "./types.ts";
import { requirePrivateAssetInstallation } from "./installation.ts";

export async function bindImageEffect(client: PoolClient, program: LocalProgram, run: Run, journey: Mutation,
  input: Facts, effect: Effect, storeId?: string): Promise<Effect> {
  const object = loadDefinition(program.application).objects.find(item => item.id === journey.command.object)!;
  const assignments = journey.command.kind === "create" ? journey.command.values : journey.command.set;
  const fields = Object.keys(assignments).filter(field => object.facts[field]?.kind === "file").sort();
  if (!fields.length) return effect;
  if (!storeId) throw new Error("PRIVATE_IMAGE_STORAGE_NOT_INSTALLED");
  await requirePrivateAssetInstallation(client, storeId);
  const assets: AssetEvidence[] = [];
  for (const objectField of fields) {
    const assignment = assignments[objectField]!;
    if (assignment.kind !== "input") throw new Error("INVALID_ASSET_INPUT");
    const value = input[assignment.field];
    if (!value || typeof value !== "object" || !("kind" in value) || value.kind !== "asset") throw new Error("INVALID_ASSET_REFERENCE");
    const asset = await privateAssetRecord(client, { actor: run.actor, surface: run.surface, runId: run.id,
      inputField: assignment.field, contractDigest: run.contract_digest, storeId }, value.reference);
    if (asset.state !== "ready" || !asset.metadata) throw new Error("IMAGE_ASSET_NOT_READY");
    const actual = assetMediaKind(asset.metadata), definition = object.facts[objectField];
    // The file's type must be one the fact accepts, and the value names the media kind exactly when the fact's does.
    if (definition?.kind !== "file" || !definition.accept.includes(asset.metadata.mediaType)
      || (value.media !== undefined && value.media !== actual)
      || (!acceptsOnlyImages(definition.accept) && value.media !== actual)) throw new Error("ASSET_MEDIA_MISMATCH");
    assets.push({ inputField: assignment.field, objectField, reference: asset.id,
      metadataDigest: createHash("sha256").update(canonical(asset.metadata)).digest("hex") });
  }
  return { ...effect, assets };
}

/** The object's file column (a foreign key to the product's asset object, src/storage/fact-columns.ts) is the link; the
 * asset object and its staging record become attached in the same transaction as the owning object's write. */
export async function attachImageEffect(client: PoolClient, program: LocalProgram, actor: string, effect: Effect) {
  for (const asset of effect.assets ?? []) {
    await attachAssetObjects(client, program, actor, asset.reference);
    await client.query("UPDATE desert_assets SET state = 'attached' WHERE id = $1", [asset.reference]);
  }
}
