import assert from "node:assert/strict";
import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { serveBuiltLocalSurface } from "../../src/build/serve.ts";
import type { LocalSession } from "../../src/local.ts";
import type { BuildManifest } from "../../src/build/manifest.ts";

export async function verifyManifestBoundaries(output: string, directory: string, session: LocalSession) {
  const cases: [string, (manifest: BuildManifest) => void, RegExp][] = [
    ["renderer", value => { value.renderer.revision = "0".repeat(64); }, /BUILD_RENDERER_MISMATCH/],
    ["surface", value => { value.surfaceDigest = "0".repeat(64); }, /BUILD_SURFACE_MISMATCH/],
    ["binding", value => { value.connection.role = "other"; }, /BUILD_BINDING_MISMATCH/],
    ["distribution", value => { value.distributionDigest = "0".repeat(64); }, /DISTRIBUTION_DIGEST_MISMATCH/],
    ["unknown", value => { Object.assign(value, { silentOverride: true }); }, /INVALID_BUILD_MANIFEST/],
  ];
  for (const [name, alter, error] of cases) {
    const copy = join(directory, name);
    cpSync(output, copy, { recursive: true });
    const path = join(copy, "DESERT-BUILD.json");
    const manifest: BuildManifest = JSON.parse(readFileSync(path, "utf8"));
    alter(manifest);
    writeFileSync(path, JSON.stringify(manifest));
    await assert.rejects(serveBuiltLocalSurface({ buildDirectory: copy, session, port: 0 }), error);
  }
}
