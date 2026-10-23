import { lstat, readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { inspectVisualSource } from "./inspect.ts";
import { classifyVisualSource, digest, type VisualSource } from "./model.ts";

export const VisualAuditVersion = "desert.visual-ownership-audit/1";
export const auditRoots = ["src/svelte", "src/build/svelte"] as const;
export const limitations = [
  "Ownership is candidate classification, not an accepted closed catalog manifest.",
  "Cross-owner CSS inheritance and shared CSS selector authority are not yet qualified.",
  "Resolved dependency/alias graphs, generated output and third-party package internals are not yet qualified.",
  "Arbitrary indirect runtime calls and descriptor flow into Svelte slots are not completely proven.",
  "Test fixtures and executable rendering outside the listed source roots are not yet sealed.",
  "No native Safari/VoiceOver or complete visual/state/environment parity evidence is claimed.",
] as const;
export type VisualInventory = Readonly<{
  version: typeof VisualAuditVersion; status: "not-qualified"; roots: readonly string[];
  sourceDigest: string; limitations: readonly string[]; sources: readonly VisualSource[];
}>;

/** Enumerates dormant sources too. No import/reachability exemption. */
export async function inventoryVisualSources(root: string): Promise<VisualInventory> {
  const sources: VisualSource[] = [];
  async function visit(path: string): Promise<void> {
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) throw new Error(`VISUAL_SOURCE_SYMLINK: ${relative(root, path)}`);
    if (stat.isDirectory()) {
      for (const entry of (await readdir(path)).sort()) await visit(join(path, entry));
    } else if (stat.isFile()) {
      const name = relative(root, path).split("\\").join("/");
      const bytes = await readFile(path);
      if (/\.(svelte|css|ts|[cm]?js)$/.test(name)) sources.push(inspectVisualSource(name, bytes.toString("utf8")));
      else sources.push({ path: name, ...classifyVisualSource(name), digest: digest(bytes), imports: [], findings: [] });
    }
  }
  for (const folder of auditRoots) await visit(join(root, folder));
  sources.sort((a, b) => a.path.localeCompare(b.path));
  return { version: VisualAuditVersion, status: "not-qualified", roots: auditRoots, limitations,
    sourceDigest: digest(JSON.stringify(sources.map(item => [item.path, item.digest]))), sources };
}
