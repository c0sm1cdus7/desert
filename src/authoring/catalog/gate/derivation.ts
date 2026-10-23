// Rule C. Law: a generated catalog file equals its regeneration from the declarations; no hand edit survives.
// Raises CATALOG_DERIVATION naming the first missing or different file.
import { generateCatalog } from "../generate.ts";
import type { CatalogLayout } from "../layout.ts";
import { normalizedJson, normalizedTypeScript } from "../normalize-source.ts";
import type { LocatedDeclaration } from "./inventory.ts";

const write = "run `node scripts/catalog.ts --write`";

export function assertCatalogDerivations(declarations: readonly LocatedDeclaration[], generated: ReadonlyMap<string, string>,
  layout: CatalogLayout): void {
  for (const expected of generateCatalog(declarations, layout)) {
    const actual = generated.get(expected.path);
    if (actual === undefined) throw new Error(`CATALOG_DERIVATION: ${expected.path} is missing; ${write}`);
    const same = expected.path.endsWith(".json")
      ? normalizedJson(actual) === normalizedJson(expected.source)
      : normalizedTypeScript(actual) === normalizedTypeScript(expected.source);
    if (!same) throw new Error(`CATALOG_DERIVATION: ${expected.path} differs from the declarations; ${write}`);
  }
}
