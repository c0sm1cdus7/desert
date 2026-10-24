// N50: a build the catalog gate did not qualify cannot be served. loadVerifiedBuild refuses an older manifest format
// and a /4 manifest without gate evidence before any other check.
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildFormat, loadVerifiedBuild, manifestFile } from "../src/build/manifest.ts";

async function withManifest(manifest: unknown, check: (directory: string) => void) {
  const directory = await mkdtemp(join(tmpdir(), "desert-manifest-"));
  try { await writeFile(join(directory, manifestFile), JSON.stringify(manifest)); check(directory); }
  finally { await rm(directory, { recursive: true, force: true }); }
}

test("a /3 manifest is an unqualified artifact", () => withManifest({ format: "desert.distribution-build/3", status: "built" }, directory => {
  assert.throws(() => loadVerifiedBuild(directory), /UNQUALIFIED_ARTIFACT: build format desert\.distribution-build\/3/);
}));

test("a /4 manifest without gate evidence is an unqualified artifact", () => withManifest({ format: buildFormat, status: "built" }, directory => {
  assert.throws(() => loadVerifiedBuild(directory), /UNQUALIFIED_ARTIFACT: no evidence of desert\.catalog-gate\/1/);
}));

test("an unknown gate version is an unqualified artifact", () => withManifest({ format: buildFormat, gate: { version: "desert.catalog-gate/0" } }, directory => {
  assert.throws(() => loadVerifiedBuild(directory), /UNQUALIFIED_ARTIFACT/);
}));

test("a qualified manifest proceeds to the schema checks", () => withManifest({ format: buildFormat, gate: { version: "desert.catalog-gate/1" } }, directory => {
  assert.throws(() => loadVerifiedBuild(directory), /INVALID_BUILD_MANIFEST/);
}));
