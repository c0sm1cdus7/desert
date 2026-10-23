import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { assertClosedVisualBoundaries } from "../src/authoring/visual-boundary/closed.ts";

const path = "src/svelte/adapter-catalog.ts";
const contractPath = "src/svelte/catalog-manifest.ts";
const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const contract = readFileSync(new URL(`../${contractPath}`, import.meta.url), "utf8");
const check = (gateway: string) => assertClosedVisualBoundaries([
  { path, source: gateway }, { path: contractPath, source: contract },
]);

test("catalog gateway cannot replace an admitted owner with a different implementation", () => {
  for (const candidate of [
    source.replace('from "./pieces/ViewWorkspace.svelte"', 'from "./pieces/Heading.svelte"'),
    source.replace('= WorkspaceOwner;', '= TextOwner;'),
    source.replace('= WorkspaceOwner;', '= wrap(WorkspaceOwner);'),
    source + '\nexport const Arbitrary = WorkspaceOwner;',
    source + '\nObject.assign(WorkspaceOwner, { extra: true });',
    source.replace('import WorkspaceOwner', 'import "./theme.css";\nimport WorkspaceOwner'),
    source.replace('AdapterComponent<"ViewWorkspace">', 'AdapterComponent<"TextContent">'),
    source.replace('export const ViewWorkspace', 'export let ViewWorkspace'),
    source.replace('= WorkspaceOwner;', '= supplied as any;'),
  ]) assert.throws(() => check(candidate), /CATALOG_GATEWAY/, candidate);
});

test("gateway identities follow the owner declarations, not local alias spelling or source hashes", () => {
  assert.doesNotThrow(() => check(source));
  assert.doesNotThrow(() => check(source.replaceAll('WorkspaceOwner', 'CatalogWorkspaceImplementation')));
  assert.doesNotThrow(() => check('// A harmless explanation.\n' + source));
});
