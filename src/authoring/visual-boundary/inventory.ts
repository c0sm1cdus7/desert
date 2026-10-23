import { lstat, readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { inspectVisualSource } from "./inspect.ts";
import { classifyVisualSource, digest, type VisualSource } from "./model.ts";
import { reconcileReviewedNarrowings } from "./debt-narrowing.ts";

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

export function assertQualifiedVisualOwnership(report: VisualInventory): never {
  const count = report.sources.reduce((sum, item) => sum + item.findings.length, 0);
  throw new Error(`VISUAL_OWNERSHIP_INCOMPLETE: ${count} detected boundary findings; ${report.limitations.length} qualification gaps`);
}

/** A regression alarm, never a successful global/release ownership result. */
export function assertNoNewVisualDebt(current: VisualInventory, baseline: VisualInventory): void {
  if (baseline.version !== VisualAuditVersion || baseline.status !== "not-qualified") throw new Error("INVALID_VISUAL_DEBT_BASELINE");
  const previous = new Map(baseline.sources.map(source => [source.path, source]));
  for (const source of current.sources) {
    const before = previous.get(source.path);
    if (!before) throw new Error(`UNCLASSIFIED_VISUAL_SOURCE: ${source.path}`);
    const classification = before.reviewedClassification ?? before;
    if (before.reviewedClassification && (!/^[a-f0-9]{64}$/.test(before.reviewedClassification.sourceDigest)
      || !before.reviewedClassification.reason.trim())) throw new Error(`INVALID_VISUAL_DEBT_REVIEW: ${source.path}`);
    if (classification.role !== source.role || classification.owner !== source.owner) throw new Error(`VISUAL_CLASSIFICATION_CHANGED: ${source.path}`);
    const findings = reconcileReviewedNarrowings(source, before);
    const reviewable = new Set(["RENDER_SLOT", "RENDERER_DOM", "OPEN_COMPONENT_CONTRACT"]);
    const counts = new Map<string, number>();
    const replacements = new Map<string, string>();
    const key = (item: VisualSource["findings"][number]) => item.code === "RENDERER_DOM"
      ? item.ownershipFingerprint ?? item.fingerprint : item.fingerprint;
    for (const item of findings.historical) {
      counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
      for (const review of item.reviewedReplacements ?? []) {
        const replacement = `${item.code}:${review.fingerprint}`;
        if (!reviewable.has(item.code) || !/^[a-f0-9]{64}$/.test(review.fingerprint)
          || !/^[a-f0-9]{64}$/.test(review.sourceDigest) || !review.reason.trim()
          || replacements.has(replacement) && replacements.get(replacement) !== key(item)) {
          throw new Error(`INVALID_VISUAL_DEBT_REVIEW: ${source.path}`);
        }
        // Old and revised source spend the same single historical occurrence.
        // Neither the review nor its baseline grants permission to render.
        replacements.set(replacement, key(item));
      }
    }
    for (const item of findings.current) {
      const identity = reviewable.has(item.code)
        ? replacements.get(`${item.code}:${key(item)}`) ?? key(item) : key(item);
      const remaining = counts.get(identity) ?? 0;
      if (!remaining) throw new Error(`NEW_VISUAL_DEBT: ${item.code} ${item.path}:${item.line}`);
      counts.set(identity, remaining - 1);
    }
  }
}
