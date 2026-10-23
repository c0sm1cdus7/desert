import { normalizedTypeScript as normalized } from "../catalog/normalize-source.ts";
import { deriveWebCatalog } from "./derive.ts";
import { readWebCatalogManifest, webCatalogManifestPath } from "./manifest.ts";

export type CatalogSource = Readonly<{ path: string; source: string }>;

/** Compare regenerated AST, never approve a historical source hash. Formatting
 * and comments are immaterial; imports, types, registrations and code are not. */
export function assertWebCatalogDerivations(sources: readonly CatalogSource[]): void {
  const fail = (reason: string): never => { throw new Error(`WEB_CATALOG_DERIVATION: ${reason}`); };
  const input = sources.find(item => item.path === webCatalogManifestPath);
  if (!input) return fail("missing manifest");
  const manifest = readWebCatalogManifest(input.source);
  for (const owner of Object.values(manifest.owners)) if (!sources.some(item => item.path === owner.source)) fail(`missing owner ${owner.source}`);
  for (const output of deriveWebCatalog(manifest)) {
    const actual = sources.find(item => item.path === output.path);
    if (!actual || normalized(actual.source) !== normalized(output.source)) fail(output.path);
  }
}
