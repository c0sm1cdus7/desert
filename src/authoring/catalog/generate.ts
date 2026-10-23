// The catalog generator: index, manifest and types are projections of the declarations, read as data.
// A pure function of its input; `node scripts/catalog.ts --write` writes it and rule C compares with it.
import { posix } from "node:path";
import type { CatalogLayout } from "./layout.ts";
import type { LocatedDeclaration } from "./gate/inventory.ts";
import { canonicalJson } from "./normalize-source.ts";

export type GeneratedFile = Readonly<{ path: string; source: string }>;
export const manifestVersion = "desert.catalog-manifest/1";
const header = "// Generated from the catalog declarations by `node scripts/catalog.ts --write`; do not edit.\n";

const exportName = (id: string) => id.split("-").map(word => word[0]!.toUpperCase() + word.slice(1)).join("");
const byId = (left: LocatedDeclaration, right: LocatedDeclaration) => left.declaration.id < right.declaration.id ? -1 : 1;

export function generateCatalog(declarations: readonly LocatedDeclaration[], layout: CatalogLayout): readonly GeneratedFile[] {
  const sorted = [...declarations].sort(byId);
  const pieces = sorted.flatMap(({ path, declaration }) => declaration.kind === "mechanism" ? [] : [{ path, declaration }]);
  const mechanisms = sorted.flatMap(({ path, declaration }) => declaration.kind === "mechanism" ? [{ path, declaration }] : []);
  const from = posix.dirname(layout.generated.index);
  const request = (path: string, entry: string) => `./${posix.relative(from, posix.join(posix.dirname(path), entry))}`;

  const index = [header, ...pieces.map(({ path, declaration }) =>
    `export { default as ${exportName(declaration.id)} } from ${JSON.stringify(request(path, declaration.owner.entry))};`), ""].join("\n");

  const manifest = canonicalJson({
    version: manifestVersion,
    pieces: Object.fromEntries(pieces.map(({ path, declaration }) => {
      const { id, binding, contract, ...data } = declaration;
      return [id, { ...data, folder: posix.dirname(path) }];
    })),
    mechanisms: Object.fromEntries(mechanisms.map(({ path, declaration }) =>
      [declaration.id, { folder: posix.dirname(path), owner: declaration.owner, files: declaration.files }])),
  });

  const ids = pieces.map(({ declaration }) => JSON.stringify(declaration.id));
  const types = [header, 'import type { ComponentProps } from "svelte";',
    `import type * as Catalog from ${JSON.stringify(`./${posix.relative(from, layout.generated.index)}`)};`, "",
    `export type CatalogId = ${ids.length ? ids.join(" | ") : "never"};`,
    "export type CatalogExports = {",
    ...pieces.map(({ declaration }) => `  readonly ${JSON.stringify(declaration.id)}: typeof Catalog.${exportName(declaration.id)};`),
    "};",
    "export type CatalogProps<Id extends CatalogId> = ComponentProps<CatalogExports[Id]>;", ""].join("\n");

  return Object.freeze([
    { path: layout.generated.index, source: index },
    { path: layout.generated.manifest, source: manifest },
    { path: layout.generated.types, source: types },
  ]);
}
