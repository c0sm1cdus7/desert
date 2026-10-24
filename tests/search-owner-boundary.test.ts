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
  }
  // Who mounts SearchField is the `uses` of each declaration (rule D holds every mount to it), read from the generated manifest.
  const manifest: { pieces: Record<string, { uses?: string[] }> } = JSON.parse(await sourceText("src/svelte/catalog/manifest.json"));
  for (const [id, piece] of Object.entries(manifest.pieces)) if (piece.uses?.includes("search-field")) consumers.push(id);
  assert.deepEqual(consumers.sort(), ["toolbar-search"],
    "SearchField belongs only to the expanding toolbar; no collection, catalog or product may create another owner");
  assert.deepEqual(rawControls.sort(), ["src/svelte/catalog/foundations/field/SearchWell.svelte", "src/svelte/catalog/foundations/search-field/SearchField.svelte"],
    "raw search controls belong only to the shared search primitives: Field's search well and SearchField until Batch 3");
});

test("catalog content cannot receive a query or filter its retained inventory", async () => {
  for (const path of ["src/svelte/catalog/renderer/public-catalog-bank/PublicCatalogBank.svelte", "src/svelte/catalog/renderer/inspection-content/InspectionContent.svelte"]) {
    const source = await sourceText(path);
    assert.doesNotMatch(source, /\bquery\b|\bmatchingEntries\b|\bbind:query\b/,
      `${path} is display content, not a search provider or query consumer`);
  }
});
