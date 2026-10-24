// What every foundation test reads the same way: the foundation's contract as the gate reads it, its specimens judged by
// rule J alone (every declared state × variant witnessed exactly once), and the piece mounted in a real browser with the
// renderer's theme.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ruleJ } from "../../src/authoring/catalog/gate/specimens.ts";
import { DesertLayout } from "../../src/authoring/catalog/layout.ts";
import { readContract, type ContractSchema } from "../../src/authoring/catalog/read-contract.ts";
import { codes, contextOf } from "./catalog-context.ts";
import { rendererCss } from "../fixtures/renderer-css.ts";
import { svelteBrowser } from "../fixtures/svelte-browser.ts";

const root = resolve(import.meta.dirname, "../.."), foundations = "src/svelte/catalog/foundations";
const read = (path: string) => readFile(resolve(root, path), "utf8");

/** Rule J's findings for one foundation, from its declaration, contract and specimens alone. */
export async function specimenFindings(id: string): Promise<readonly string[]> {
  const folder = `${foundations}/${id}`, files: Record<string, string> = {};
  for (const name of [`${id}.catalog.ts`, `${id}.contract.ts`, `${id}.specimens.ts`]) files[`${folder}/${name}`] = await read(`${folder}/${name}`);
  return codes(ruleJ(contextOf(files, DesertLayout)));
}

const shape = (schema: ContractSchema): unknown => schema.kind === "literal" ? schema.value
  : schema.kind === "union" ? schema.members.map(shape) : schema.kind === "reference" ? `${schema.name}` : schema.kind;
/** The contract's props as `name: shape` (`?` for optional), with each union spelled as its literal values. */
export async function contractShape(id: string): Promise<Readonly<Record<string, unknown>>> {
  const path = `${foundations}/${id}/${id}.contract.ts`, contract = readContract(path, await read(path), DesertLayout);
  if (!contract.closed) throw new Error(`FOUNDATION_TEST: ${id} has a stub contract`);
  return Object.fromEntries(Object.entries(contract.props).map(([name, item]) => [`${name}${item.optional ? "?" : ""}`, shape(item.schema)]));
}

/** A Svelte page that imports from the catalog index, mounted with the renderer's theme. */
export async function mounted(markup: string, script = "") {
  return svelteBrowser(`<script lang="ts">\n  import * as Catalog from "@desert/svelte/catalog/index.ts";\n${script}\n</script>\n${markup}`, {}, undefined,
    { initialCss: await rendererCss() });
}
