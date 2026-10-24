import { Type, type Static } from "@sinclair/typebox";
import { DistributionSchema } from "../distributions.ts";
import { createSchemaValidator } from "../validation.ts";
import { freezeDeep, jsonSnapshot } from "../json.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileInventory, digest } from "./files.ts";
import { loadLocalMedia, localMediaFile, requireDistinctMedia } from "./media.ts";
import { catalogGateEvidence } from "../authoring/visual-boundary/source.ts";

export const manifestFile = "DESERT-BUILD.json";
/** /4 adds the evidence of the catalog gate that let the build run (plan 3.5). */
export const buildFormat = "desert.distribution-build/4";
export const gateVersion = catalogGateEvidence.version;
const name = Type.String({ minLength: 1 });
const sha = Type.String({ pattern: "^[a-f0-9]{64}$" });
const closed = { additionalProperties: false };
const ManifestSchema = Type.Object({
  format: Type.Literal(buildFormat), status: Type.Literal("built"),
  gate: Type.Object({ version: Type.Literal(gateVersion) }, closed),
  productId: name, contractDigest: sha, distributionId: name, distributionDigest: sha,
  distributions: Type.Array(DistributionSchema), surfaceId: name, surfaceDigest: sha, viewProgramDigest: sha,
  activitiesDigest: Type.Optional(sha),
  renderer: Type.Object({ id: name, revision: sha }, closed),
  connection: Type.Object({ kind: Type.Literal("local-http-session"), roles: Type.Array(name, { minItems: 1, uniqueItems: true }), service: name }, closed),
  files: Type.Record(Type.String(), sha),
}, closed);
export type BuildManifest = Static<typeof ManifestSchema>;
const validManifest = createSchemaValidator<BuildManifest>(ManifestSchema);

/** A build the catalog gate did not qualify is refused before any other check: an older format or an unknown gate. */
function requireQualifiedArtifact(manifest: unknown): void {
  const format = manifest && typeof manifest === "object" ? Reflect.get(manifest, "format") : undefined;
  const gate = manifest && typeof manifest === "object" ? Reflect.get(manifest, "gate") : undefined;
  const version = gate && typeof gate === "object" ? Reflect.get(gate, "version") : undefined;
  if (format !== buildFormat) throw new Error(`UNQUALIFIED_ARTIFACT: build format ${String(format)} is not ${buildFormat}`);
  if (version !== gateVersion) throw new Error(`UNQUALIFIED_ARTIFACT: no evidence of ${gateVersion}`);
}

export function loadVerifiedBuild(directory: string) {
  const files = fileInventory(directory, [manifestFile]);
  const manifest = jsonSnapshot(JSON.parse(readFileSync(join(directory, manifestFile), "utf8")));
  requireQualifiedArtifact(manifest);
  if (!validManifest(manifest)) throw new Error("INVALID_BUILD_MANIFEST");
  if (digest(files) !== digest(manifest.files)) throw new Error("BUILD_FILES_MISMATCH");
  if (Object.hasOwn(files, localMediaFile)) requireDistinctMedia(loadLocalMedia(directory).assets, files);
  if (manifest.distributionDigest !== digest({ target: manifest.distributionId, distributions: manifest.distributions })) {
    throw new Error("DISTRIBUTION_DIGEST_MISMATCH");
  }
  return freezeDeep(manifest);
}
