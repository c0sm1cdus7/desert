// What a content rule receives: the read tree, every visual source in memory, one parse and one import list per
// file, and the ownership map. Rules are pure functions of this context and return violations.
import { posix } from "node:path";
import type { CatalogLayout } from "../layout.ts";
import { readContract, type ReadContract } from "../read-contract.ts";
import type { LocatedDeclaration } from "./inventory.ts";
import { ownershipOf, type Ownership } from "./ownership.ts";
import { parseSource, type Parsed } from "./parse.ts";
import { definingFile, exportedNames, importsOf, type Import } from "./resolve-imports.ts";
import type { Violation } from "./violation.ts";

export type GateContext = Readonly<{
  layout: CatalogLayout;
  paths: readonly string[];
  declarations: readonly LocatedDeclaration[];
  ledger: unknown;
  owners: Ownership;
  text: (path: string) => string | undefined;
  parsed: (path: string) => Parsed;
  imports: (path: string) => readonly Import[];
  /** The file that defines an imported binding, through every barrel. */
  definition: (item: Import, imported: string) => string | undefined;
  /** The contract of a declared piece, read as data; undefined when the piece or its contract file is absent. */
  contract: (id: string) => ReadContract | undefined;
}>;
export type ContentRule = (context: GateContext) => readonly Violation[];

export const parseable = (path: string) => /\.(svelte|ts|js|mjs)$/.test(path) && !path.endsWith(".d.ts");

export function createContext(input: Readonly<{ layout: CatalogLayout; paths: readonly string[]; declarations: readonly LocatedDeclaration[];
  ledger: unknown; sources: ReadonlyMap<string, string> }>): GateContext {
  const present = new Set(input.paths), parsedCache = new Map<string, Parsed>(), importCache = new Map<string, readonly Import[]>();
  const exportsCache = new Map<string, ReadonlyMap<string, string>>();
  const text = (path: string) => input.sources.get(path);
  const parsed = (path: string): Parsed => {
    const cached = parsedCache.get(path);
    if (cached) return cached;
    const source = text(path);
    if (source === undefined) throw new Error(`CATALOG_GATE_SOURCES: ${path} is not a loaded visual source`);
    const value = parseSource(path, source);
    parsedCache.set(path, value);
    return value;
  };
  const exists = (path: string) => present.has(path);
  const imports = (path: string): readonly Import[] => {
    const cached = importCache.get(path);
    if (cached) return cached;
    const value = parseable(path) && text(path) !== undefined ? importsOf(path, parsed(path), exists, input.layout.aliases) : [];
    importCache.set(path, value);
    return value;
  };
  const exported = (path: string) => {
    const cached = exportsCache.get(path);
    if (cached) return cached;
    const value = parseable(path) && text(path) !== undefined ? exportedNames(parsed(path)) : new Map<string, string>();
    exportsCache.set(path, value);
    return value;
  };
  const owners = ownershipOf(input.declarations, input.layout), contracts = new Map<string, ReadContract | undefined>();
  const contract = (id: string) => {
    if (contracts.has(id)) return contracts.get(id);
    const located = owners.declaration(id), path = located && posix.join(posix.dirname(located.path), `${id}.contract.ts`);
    const source = path === undefined ? undefined : text(path);
    const value = path === undefined || source === undefined ? undefined : readContract(path, source);
    contracts.set(id, value);
    return value;
  };
  return Object.freeze({
    layout: input.layout, paths: input.paths, declarations: input.declarations, ledger: input.ledger,
    owners, text, parsed, imports, contract,
    definition: (item: Import, imported: string) => item.target.kind === "file"
      ? imported === "*" ? item.target.path : definingFile(item.target.path, imported, imports, exported) : undefined,
  });
}
