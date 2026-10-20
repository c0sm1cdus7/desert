import { mkdirSync, cpSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import type { CompiledPublicCatalog } from "../../public-catalog/index.ts";
import { createBuildProject } from "../svelte/project.ts";
import { rendererRevision } from "../svelte/revision.ts";
import { fileInventory } from "../files.ts";
import { bindCatalogAssets } from "./assets.ts";
import { catalogBuildFile, type PublicCatalogBuild } from "./manifest.ts";
import { publicCatalogSchemas } from "../../public-catalog/protocol.ts";
import { prepareRenditions } from './renditions.ts';

/** Experimental read-only family; no controller, business writes, or implicit migration. */
export async function buildPublicCatalogWeb(application: CompiledPublicCatalog, options: {
  outputDirectory: string; sourceRoot: string;
}) {
  const output = resolve(options.outputDirectory);
  if (existsSync(output)) throw new Error("BUILD_DESTINATION_EXISTS");
  const assets = bindCatalogAssets(options.sourceRoot, application.assets);
  await prepareRenditions(assets);
  const source = `export const surface = ${JSON.stringify(application.surface)};\n`;
  const project = createBuildProject(source, "public-catalog");
  const revision = rendererRevision();
  let ownsOutput = false;
  try {
    await project.run("build");
    if (rendererRevision() !== revision) throw new Error("BUILDER_CHANGED_DURING_BUILD");
    mkdirSync(dirname(output), { recursive: true });
    mkdirSync(output); ownsOutput = true;
    cpSync(join(project.directory, "build"), join(output, "web"), { recursive: true });
    writeFileSync(join(output, "package.json"), JSON.stringify({ private: true, type: "module" }));
    writeFileSync(join(output, "surface.json"), JSON.stringify(application.surface, null, 2) + "\n");
    writeFileSync(join(output, "schemas.json"), JSON.stringify(publicCatalogSchemas(), null, 2) + "\n");
    const manifest: PublicCatalogBuild = {
      format: "desert.public-catalog-build/1", productId: application.id, contractDigest: application.digest,
      rendererRevision: revision, mode: "public-read-only", mediaPolicy: "external-local-bindings",
      assets: assets.map(({ file: _file, ...metadata }) => metadata), files: fileInventory(output),
    };
    writeFileSync(join(output, catalogBuildFile), JSON.stringify(manifest, null, 2) + "\n");
    return manifest;
  } catch (error) {
    if (ownsOutput) rmSync(output, { recursive: true });
    throw error;
  } finally { project.close(); }
}
