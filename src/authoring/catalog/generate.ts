// The catalog generator: index, manifest and types are projections of the declarations, read as data.
// A pure function of its input; `node scripts/catalog.ts --write` writes it and rule C compares with it.
import { posix } from "node:path";
import type { CatalogLayout } from "./layout.ts";
import type { LocatedDeclaration } from "./gate/inventory.ts";
import type { ReadContract } from "./read-contract.ts";
import { canonicalJson } from "./normalize-source.ts";

export type GeneratedFile = Readonly<{ path: string; source: string }>;
export const manifestVersion = "desert.catalog-manifest/1";
const header = "// Generated from the catalog declarations by `node scripts/catalog.ts --write`; do not edit.\n";

const exportName = (id: string) => id.split("-").map(word => word[0]!.toUpperCase() + word.slice(1)).join("");
const byId = (left: LocatedDeclaration, right: LocatedDeclaration) => left.declaration.id < right.declaration.id ? -1 : 1;

/** What the generator reads: the declarations and each piece's contract, both as data. */
export type CatalogSource = Readonly<{ declarations: readonly LocatedDeclaration[]; contracts: ReadonlyMap<string, ReadContract>;
  generated: ReadonlyMap<string, string> }>;

export function generateCatalog(source: Pick<CatalogSource, "declarations" | "contracts">, layout: CatalogLayout): readonly GeneratedFile[] {
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
  ]);
}
