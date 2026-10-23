// A content-rule context over an in-memory tree: the same createContext the gate uses, fed from a record of files.
// Declarations are read from the `*.catalog.ts` / `*.mechanism.ts` entries of the record, as the gate reads them.
import { createContext, type GateContext } from "../../src/authoring/catalog/gate/context.ts";
import type { LocatedDeclaration } from "../../src/authoring/catalog/gate/inventory.ts";
import { declarationSuffixes, type CatalogLayout } from "../../src/authoring/catalog/layout.ts";
import { readDeclarations } from "../../src/authoring/catalog/read-declaration.ts";
import { testLayout } from "./catalog-layout.ts";

export function contextOf(files: Readonly<Record<string, string>>, layout: CatalogLayout = testLayout(), ledger: unknown = undefined): GateContext {
  const paths = Object.keys(files).sort(), declarations: LocatedDeclaration[] = [];
  for (const path of paths) if (declarationSuffixes.some(suffix => path.endsWith(suffix))) {
    for (const declaration of readDeclarations(path, files[path] ?? "")) declarations.push({ path, declaration });
  }
  return createContext({ layout, paths, declarations, ledger, sources: new Map(Object.entries(files)) });
}

/** `code path what` of each violation, without line numbers: what a test usually asserts. */
export const codes = (violations: readonly { code: string; path: string; what: string }[]) =>
  violations.map(item => `${item.code} ${item.path} ${item.what}`);

const foundationSource = (id: string, entry: string, extra = "") => `import { defineFoundation } from "x";
import { C } from "./${id}.contract.ts";
export const F = defineFoundation({ id: "${id}", purpose: "x", owner: { entry: "${entry}"${extra} }, shape: "radius",
  states: ["default"], approval: "required", contract: C } as const);\n`;
const compositionSource = (id: string, entry: string, uses: readonly string[], extra = "") => `import { defineComposition } from "x";
import { C } from "./${id}.contract.ts";
export const K = defineComposition({ id: "${id}", purpose: "x", owner: { entry: "${entry}" }, uses: ${JSON.stringify(uses)},
  approval: "none", contract: C${extra} } as const);\n`;

/** Files of one foundation folder: declaration, stub contract, entry. `extra` is spliced into `owner`. */
export const foundation = (id: string, entry: string, markup: string, extra = "", folder = "src/svelte/catalog/foundations"): Record<string, string> => ({
  [`${folder}/${id}/${id}.catalog.ts`]: foundationSource(id, entry, extra),
  [`${folder}/${id}/${id}.contract.ts`]: "export const C = {} as const;\n",
  [`${folder}/${id}/${entry}`]: markup,
});
/** Files of one composition folder. `extra` is spliced after `contract`. */
export const composition = (id: string, entry: string, uses: readonly string[], markup: string, extra = "",
  folder = "src/svelte/catalog/compositions"): Record<string, string> => ({
  [`${folder}/${id}/${id}.catalog.ts`]: compositionSource(id, entry, uses, extra),
  [`${folder}/${id}/${id}.contract.ts`]: "export const C = {} as const;\n",
  [`${folder}/${id}/${entry}`]: markup,
});
