import { Type, type Static } from "@sinclair/typebox";
import { DistributionSchema } from "../distributions.ts";
import { createSchemaValidator } from "../validation.ts";
import { freezeDeep, jsonSnapshot } from "../json.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileInventory, digest } from "./files.ts";
import { loadLocalMedia, localMediaFile, requireDistinctMedia } from "./media.ts";

export const manifestFile = "DESERT-BUILD.json";
const name = Type.String({ minLength: 1 });
const sha = Type.String({ pattern: "^[a-f0-9]{64}$" });
const closed = { additionalProperties: false };
const ManifestSchema = Type.Object({
  format: Type.Literal("desert.distribution-build/3"), status: Type.Literal("built"),
  productId: name, contractDigest: sha, distributionId: name, distributionDigest: sha,
  distributions: Type.Array(DistributionSchema), surfaceId: name, surfaceDigest: sha, viewProgramDigest: sha,
  activitiesDigest: Type.Optional(sha),
  renderer: Type.Object({ id: name, revision: sha }, closed),
  connection: Type.Object({ kind: Type.Literal("local-http-session"), roles: Type.Array(name, { minItems: 1, uniqueItems: true }), service: name }, closed),
  files: Type.Record(Type.String(), sha),
}, closed);
export type BuildManifest = Static<typeof ManifestSchema>;
const validManifest = createSchemaValidator<BuildManifest>(ManifestSchema);

export function loadVerifiedBuild(directory: string) {
  const files = fileInventory(directory, [manifestFile]);
  const manifest = jsonSnapshot(JSON.parse(readFileSync(join(directory, manifestFile), "utf8")));
  if (!validManifest(manifest)) throw new Error("INVALID_BUILD_MANIFEST");
  if (digest(files) !== digest(manifest.files)) throw new Error("BUILD_FILES_MISMATCH");
  if (Object.hasOwn(files, localMediaFile)) requireDistinctMedia(loadLocalMedia(directory).assets, files);
  if (manifest.distributionDigest !== digest({ target: manifest.distributionId, distributions: manifest.distributions })) {
    throw new Error("DISTRIBUTION_DIGEST_MISMATCH");
  }
  return freezeDeep(manifest);
}
