// The catalog generator: index, manifest, types, the renderer table and the theme entry's stylesheet block are projections of
// the declarations, read as data.
// A pure function of its input; `node scripts/catalog.ts --write` writes it and rule C compares with it.
import { posix } from "node:path";
import type { CatalogLayout } from "./layout.ts";
import type { LocatedDeclaration } from "./gate/inventory.ts";
import type { ReadContract } from "./read-contract.ts";
import { canonicalJson } from "./normalize-source.ts";
import { generateMessageKeys } from "../../messages/generate.ts";
import { themeStylesheetImports, withThemeStylesheets } from "./theme-stylesheets.ts";

export type GeneratedFile = Readonly<{ path: string; source: string }>;
export const manifestVersion = "desert.catalog-manifest/1";
const header = "// Generated from the catalog declarations by `node scripts/catalog.ts --write`; do not edit.\n";

const exportName = (id: string) => id.split("-").map(word => word[0]!.toUpperCase() + word.slice(1)).join("");
const byId = (left: LocatedDeclaration, right: LocatedDeclaration) => left.declaration.id < right.declaration.id ? -1 : 1;

/** What the generator reads: the declarations, each piece's contract and the message bundles, all as data. */
export type CatalogSource = Readonly<{ declarations: readonly LocatedDeclaration[]; contracts: ReadonlyMap<string, ReadContract>;
  generated: ReadonlyMap<string, string>; messages: ReadonlyMap<string, string> }>;
/** The SDK module every message catalog is built with; the generated keys module imports it. */
export const messageCatalogModule = "src/messages/catalog.ts";

export function generateCatalog(source: Pick<CatalogSource, "declarations" | "contracts" | "messages" | "generated">, layout: CatalogLayout): readonly GeneratedFile[] {
  const { declarations, contracts } = source;
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
  // A closed contract types its piece: props from the contract, on<event> per event, a Snippet per declared slot.
  // A stub contract leaves the props to the entry's own declaration until the piece is migrated.
  const closed = pieces.flatMap(({ path, declaration }) => {
    const contract = contracts.get(declaration.id);
    return contract?.closed ? [{ id: declaration.id, binding: contract.binding, alias: `${exportName(declaration.id)}Contract`,
      request: request(path, `${declaration.id}.contract.ts`), slots: Object.keys(declaration.slots ?? {}) }] : [];
  });
  const closedIds = new Set(closed.map(item => item.id));
  const propsOf = (id: string) => {
    const item = closed.find(candidate => candidate.id === id);
    if (!item) return `ComponentProps<typeof Catalog.${exportName(id)}>`;
    const slots = item.slots.map(slot => `readonly ${JSON.stringify(slot)}?: Snippet`).join("; ");
    return `ContractProps<typeof ${item.alias}> & ContractEvents<typeof ${item.alias}>${slots ? ` & { ${slots} }` : ""}`;
  };
  const types = [header, 'import type { ComponentProps, Snippet } from "svelte";', 'import type { Static, TSchema } from "@sinclair/typebox";',
    `import type * as Catalog from ${JSON.stringify(`./${posix.relative(from, layout.generated.index)}`)};`,
    ...closed.map(item => `import type { ${item.binding} as ${item.alias} } from ${JSON.stringify(item.request)};`), "",
    "/** Contract data reaches a piece read-only, so callers may pass frozen state; functions keep their own type. */",
    "type DeepReadonly<T> = T extends (...args: never[]) => unknown ? T",
    "  : T extends readonly unknown[] ? { readonly [K in keyof T]: DeepReadonly<T[K]> }  // a mapped tuple stays a tuple",
    "  : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;",
    "type ContractProps<C> = C extends { readonly props: infer P extends TSchema } ? DeepReadonly<Static<P>> : {};",
    "type ContractEvents<C> = C extends { readonly events: infer E extends TSchema }",
    "  ? { [K in keyof Static<E> & string as `on${K}`]?: (value: DeepReadonly<Static<E>[K]>) => void } : {};", "",
    `export type CatalogId = ${ids.length ? ids.join(" | ") : "never"};`,
    "export type CatalogExports = {",
    ...pieces.map(({ declaration }) => `  readonly ${JSON.stringify(declaration.id)}: typeof Catalog.${exportName(declaration.id)};`),
    "};",
    "/** The props of a piece: from its closed contract, else (stub contract, not yet migrated) from its entry. */",
    "export type CatalogPropsTable = {",
    ...pieces.map(({ declaration }) => `  readonly ${JSON.stringify(declaration.id)}: ${propsOf(declaration.id)};`),
    "};",
    "export type CatalogProps<Id extends CatalogId> = CatalogPropsTable[Id];",
    `/** Pieces whose contract is closed: ${closedIds.size}. */`,
    `export type ClosedContractId = ${closedIds.size ? [...closedIds].map(id => JSON.stringify(id)).join(" | ") : "never"};`,
    "/** One witness of a piece in one state and one value per variant axis (`<id>.specimens.ts`, rule J). */",
    "export type CatalogSpecimen<Id extends CatalogId> = Readonly<{ state: string; variants?: Readonly<Record<string, string>>; props: CatalogProps<Id> }>;",
    ""].join("\n");

  return Object.freeze([
    { path: layout.generated.index, source: index },
    { path: layout.generated.manifest, source: manifest },
    { path: layout.generated.types, source: types },
    { path: layout.generated.renderers, source: rendererTable(pieces, layout) },
    { path: layout.generated.sources, source: [header, "/** The entry file of every declared piece, as the visible catalog shows it. */",
      "export const CatalogSources = Object.freeze({",
      ...pieces.map(({ path, declaration }) => `  ${JSON.stringify(declaration.id)}: ${JSON.stringify(posix.join(posix.dirname(path), declaration.owner.entry))},`),
      "} as const);", ""].join("\n") },
    ...source.messages.size ? [{ path: layout.messages.keys, source: generateMessageKeys(source.messages, {
      catalogModule: `./${posix.relative(posix.dirname(layout.messages.keys), messageCatalogModule)}`, command: "node scripts/catalog.ts --write" }) }] : [],
    ...themeEntries(source, layout),
  ]);
}

/** The theme entry (the theme category's file) with its stylesheet block regenerated, when the tree has one. */
function themeEntries(source: Pick<CatalogSource, "declarations" | "generated">, layout: CatalogLayout): GeneratedFile[] {
  return (layout.fixed.theme ?? []).flatMap(path => {
    const text = source.generated.get(path);
    return text === undefined ? [] : [{ path, source: withThemeStylesheets(text, themeStylesheetImports(source.declarations, path)) }];
  });
}

/** The piece each resolved node kind renders through (each declaration's `renders`), typed by NodeRendererTable. Entries
 * are imported directly, not through the index: the index also exports the dispatcher that imports this table. */
function rendererTable(pieces: readonly LocatedDeclaration[], layout: CatalogLayout): string {
  const from = posix.dirname(layout.generated.renderers);
  const request = (path: string) => { const relative = posix.relative(from, path); return relative.startsWith(".") ? relative : `./${relative}`; };
  const rendering = pieces.flatMap(({ path, declaration }) => declaration.kind !== "mechanism" && declaration.renders?.length
    ? [{ name: exportName(declaration.id), entry: posix.join(posix.dirname(path), declaration.owner.entry), kinds: declaration.renders }] : []);
  const key = (kind: string) => /^[a-z]+$/.test(kind) ? kind : JSON.stringify(kind);
  return [header + `import type { NodeRendererTable } from ${JSON.stringify(request(layout.rendererTypes))};`,
    ...rendering.map(item => `import ${item.name} from ${JSON.stringify(request(item.entry))};`), "",
    "export const nodeRenderers: NodeRendererTable = Object.freeze({",
    ...rendering.flatMap(item => item.kinds.map(kind => `  ${key(kind)}: ${item.name},`)),
    "} satisfies NodeRendererTable);", ""].join("\n");
}
