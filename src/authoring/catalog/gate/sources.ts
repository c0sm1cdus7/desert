// Rule P. Law: deleting a file the gate needs cannot switch the gate off, and a gate folder holds only listed modules.
// Raises CATALOG_GATE_SOURCES. Imports only the file system, so it runs before any rule module is loaded.
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { CatalogLayout } from "../layout.ts";

async function exists(path: string): Promise<boolean> {
  try { return (await stat(path)).isFile(); }
  catch (error) { if (error instanceof Error && "code" in error && error.code === "ENOENT") return false; throw error; }
}

async function filesUnder(root: string, folder: string): Promise<string[]> {
  let entries;
  try { entries = await readdir(join(root, folder), { withFileTypes: true }); }
  catch (error) { if (error instanceof Error && "code" in error && error.code === "ENOENT") return []; throw error; }
  const files: string[] = [];
  for (const entry of entries) {
    const path = `${folder}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await filesUnder(root, path));
    else files.push(path);
  }
  return files;
}

export async function assertGateSources(root: string, layout: CatalogLayout): Promise<void> {
  const required = [...layout.gate.modules, ...layout.gate.required, ...layout.gate.reads, layout.ledger, layout.generated.index];
  const missing: string[] = [];
  for (const path of required) if (!await exists(join(root, path))) missing.push(path);
  if (missing.length) throw new Error(`CATALOG_GATE_SOURCES: missing ${missing.sort().join(", ")}`);
  const listed = new Set(layout.gate.modules), unlisted: string[] = [];
  for (const folder of layout.gate.roots) for (const path of await filesUnder(root, folder)) if (!listed.has(path)) unlisted.push(path);
  if (unlisted.length) throw new Error(`CATALOG_GATE_SOURCES: ${unlisted.sort().join(", ")} is not listed in the layout's gate modules`);
}
