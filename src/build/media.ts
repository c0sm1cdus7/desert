import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, type Frozen } from "../json.ts";
import { LogicalIdSchema } from "../public-catalog/node-schema.ts";
import { bindCatalogAssets, catalogMediaTypes, type CatalogAssetBinding, type BoundCatalogAsset } from "./public-catalog/assets.ts";

/** Explicit read-only local reference assets, not private uploads or an authorization mechanism. */
export type LocalMediaBinding = Readonly<{ sourceRoot: string; assets: readonly CatalogAssetBinding[] }>;
export const localMediaFile = "LOCAL-MEDIA.json";
const mediaTypes = [...new Set(Object.values(catalogMediaTypes))];
const schema = Type.Object({
  format: Type.Literal("desert.local-media/1"), policy: Type.Literal("external-local-reference"),
  assets: Type.Array(Type.Object({
    id: LogicalIdSchema, digest: Type.String({ pattern: "^[a-f0-9]{64}$" }),
    size: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
    mediaType: Type.Union(mediaTypes.map(type => Type.Literal(type))),
  }, { additionalProperties: false }), { minItems: 1 }),
}, { additionalProperties: false });
export type LocalMediaAttestation = Frozen<Static<typeof schema>>;

export function bindLocalMedia(binding: LocalMediaBinding): readonly BoundCatalogAsset[] {
  const assets = bindCatalogAssets(binding.sourceRoot, binding.assets);
  if (assets.some(asset => !mediaTypes.includes(asset.mediaType))) throw new Error("UNSUPPORTED_LOCAL_MEDIA_TYPE");
  return Object.freeze([...assets].sort((a, b) => a.id.localeCompare(b.id, "en")));
}

export function mediaAttestation(assets: readonly BoundCatalogAsset[]): LocalMediaAttestation {
  const value = { format: "desert.local-media/1", policy: "external-local-reference",
    assets: assets.map(({ file: _file, ...metadata }) => metadata) };
  if (!Check(schema, value)) throw new Error("INVALID_LOCAL_MEDIA_ATTESTATION");
  return freezeDeep(value);
}

export function writeLocalMedia(directory: string, assets: readonly BoundCatalogAsset[]) {
  writeFileSync(join(directory, localMediaFile), JSON.stringify(mediaAttestation(assets), null, 2) + "\n", { flag: "wx" });
}

export function loadLocalMedia(directory: string): LocalMediaAttestation {
  const value: unknown = JSON.parse(readFileSync(join(directory, localMediaFile), "utf8"));
  if (!Check(schema, value) || new Set(value.assets.map(asset => asset.id)).size !== value.assets.length) {
    throw new Error("INVALID_LOCAL_MEDIA_ATTESTATION");
  }
  return freezeDeep(value);
}

export function requireDistinctMedia(assets: readonly { id: string }[], files: Readonly<Record<string, string>>) {
  if (assets.some(asset => Object.hasOwn(files, `web/client/media/${asset.id}`))) throw new Error("LOCAL_MEDIA_ASSET_COLLISION");
}
