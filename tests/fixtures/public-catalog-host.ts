import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compilePublicCatalog } from "../../src/public-catalog/index.ts";
import { bindCatalogAssets } from "../../src/build/public-catalog/assets.ts";
import { catalogBuildFile, publicCatalogBuildFormat, type PublicCatalogBuild } from "../../src/build/public-catalog/manifest.ts";
import { catalogGateEvidence } from "../../src/authoring/catalog/gate/build-gate.ts";
import { fileInventory } from "../../src/build/files.ts";
import { catalogFixture } from "./public-catalog.ts";

/** Intentionally permissive renderer: any host allowlist failure becomes an observable 200. */
const handler = `export function handler(request, response) {
  response.writeHead(200, {"Content-Type":"text/plain"});
  response.end("renderer:" + request.url);
}\n`;

export function publicCatalogHostFixture() {
  const directory = mkdtempSync(join(tmpdir(), "desert-catalog-host-test-"));
  const buildDirectory = join(directory, "build");
  const sourceRoot = join(directory, "source");
  mkdirSync(join(buildDirectory, "web/client/_app"), { recursive: true });
  mkdirSync(join(sourceRoot, "media"), { recursive: true });
  // A real 2×2 JPEG: host preparation now decodes and optimizes bound images.
  const bytes = Buffer.from('/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAABv/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AI4AzEX/2Q==', 'base64');
  writeFileSync(join(sourceRoot, "media/lake.jpg"), bytes);
  writeFileSync(join(sourceRoot, "media/hill.jpg"), bytes);
  const application = compilePublicCatalog(catalogFixture());
  writeFileSync(join(buildDirectory, "package.json"), JSON.stringify({ type: "module" }));
  writeFileSync(join(buildDirectory, "web/handler.js"), handler);
  writeFileSync(join(buildDirectory, "web/client/_app/app.js"), "export const booted = true;\n");
  writeFileSync(join(buildDirectory, "surface.json"), JSON.stringify(application.surface));
  const manifest: PublicCatalogBuild = {
    format: publicCatalogBuildFormat, gate: { version: catalogGateEvidence.version }, productId: application.id, contractDigest: application.digest,
    rendererRevision: "f".repeat(64), mode: "public-read-only", mediaPolicy: "external-local-bindings",
    assets: bindCatalogAssets(sourceRoot, application.assets).map(({ file: _file, ...metadata }) => metadata),
    files: fileInventory(buildDirectory),
  };
  const writeManifest = (value: unknown) => writeFileSync(join(buildDirectory, catalogBuildFile), JSON.stringify(value));
  writeManifest(manifest);
  return { directory, buildDirectory, sourceRoot, application, manifest, writeManifest, bytes,
    options: { buildDirectory, sourceRoot, assets: application.assets, port: 0 },
    close() { rmSync(directory, { recursive: true, force: true }); },
  };
}
