import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const baseline = process.env.DESERT_SEARCH_GATE_BASELINE;
const sourceText = (path: string) => baseline
  ? execFileSync("git", ["show", `${baseline}:${path}`], { cwd: root, encoding: "utf8" })
  : readFile(resolve(root, path), "utf8");
async function sources(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? sources(resolve(directory, entry.name))
    : entry.name.endsWith(".svelte") ? [resolve(directory, entry.name)] : []))).flat();
}

test("production search controls have exactly one toolbar owner and no inline alternatives", async () => {
  const consumers: string[] = [];
  const rawControls: string[] = [];
  const paths = baseline
    ? execFileSync("git", ["ls-tree", "-r", "--name-only", baseline, "src/svelte"], { cwd: root, encoding: "utf8" })
      .trim().split("\n").filter(path => path.endsWith(".svelte"))
    : (await sources(resolve(root, "src/svelte"))).map(file => relative(root, file));
  for (const path of paths) {
    const source = await sourceText(path);
    if (/(?:\btype|\brole)\s*=\s*(?:["'](?:search|searchbox)["']|\{\s*["'](?:search|searchbox)["']\s*\})/.test(source))
      rawControls.push(path);
    // The search well is Field's search purpose (SearchField was deleted in Batch 3): who asks for it owns a search.
    if (/\bpurpose="search"/.test(source)) consumers.push(path);
  }
  assert.deepEqual(consumers.sort(), ["src/svelte/catalog/foundations/bar/BarSearch.svelte"],
    "the search field belongs only to the expanding toolbar; no collection, catalog or product may create another owner");
  assert.deepEqual(rawControls.sort(), ["src/svelte/catalog/foundations/field/SearchWell.svelte"],
    "raw search controls belong only to the shared search primitive: Field's search well");
});

test("catalog content cannot receive a query or filter its retained inventory", async () => {
  for (const path of ["src/svelte/catalog/renderer/public-catalog-bank/PublicCatalogBank.svelte", "src/svelte/catalog/renderer/inspection-content/InspectionContent.svelte"]) {
    const source = await sourceText(path);
    assert.doesNotMatch(source, /\bquery\b|\bmatchingEntries\b|\bbind:query\b/,
      `${path} is display content, not a search provider or query consumer`);
  }
});
