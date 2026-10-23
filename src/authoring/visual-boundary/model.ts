import { createHash } from "node:crypto";
import { sealedAdapterPaths } from "./adapter.ts";

export type VisualRole = "adapter" | "composition" | "primitive" | "mechanism" | "vendor-private" | "data" | "asset";
export type Finding = Readonly<{
  code: string; path: string; line: number; operation: string; fingerprint: string;
  ownershipFingerprint?: string;
  /** Reviewed evolution of one existing slot/DOM/contract occurrence, never owner approval.
   * fingerprint is its operative identity (ownershipFingerprint for DOM);
   * sourceDigest records provenance, not a file-level permission or match key.
   */
  reviewedReplacements?: readonly Readonly<{ fingerprint: string; sourceDigest: string; reason: string }>[];
  /** One historical forwarding occurrence may narrow to an exact multiset.
   * Unlike one-to-one provenance, the complete current source digest must match.
   * Original and replacement families are mutually exclusive; raw findings stay visible.
   */
  reviewedNarrowings?: readonly Readonly<{ sourceDigest: string; reason: string;
    findings: readonly Readonly<{ code: string; fingerprint: string }>[] }>[];
}>;
export type VisualSource = Readonly<{
  path: string; role: VisualRole; owner: string; digest: string;
  /** Audited responsibility migration; historical classification stays intact. */
  reviewedClassification?: Readonly<{ role: VisualRole; owner: string; sourceDigest: string; reason: string }>;
  imports: readonly string[]; findings: readonly Finding[];
}>;
export const digest = (source: string | Buffer) => createHash("sha256").update(source).digest("hex");

export function finding(path: string, source: string, code: string, start: number, end: number): Finding {
  const operation = source.slice(start, end).trim();
  return { code, path, line: source.slice(0, start).split("\n").length, operation: operation.slice(0, 240),
    fingerprint: digest(JSON.stringify([path, code, operation])) };
}

/** These classify responsibilities for audit; none grants ownership approval. */
const adapters = new Set([...sealedAdapterPaths, "src/svelte/catalog/renderer/node-renderer/NodeRenderer.svelte"]);
const primitives = new Set([
  "Action", "Availability", "CharacterCounter", "ClearInput", "Face", "FactValue", "Heading",
  "MaskedInput", "SearchField", "TextInput", "media/Image", "ToolbarIdentity",
]);
export function classifyVisualSource(path: string): { role: VisualRole; owner: string } {
  const stem = path.replace(/^src\/svelte\//, "").replace(/\.svelte$/, "");
  if (path.includes("/vendor/")) {
    const family = /\/components\/ui\/([^/]+)/.exec(path)?.[1] ?? "shared";
    return { role: /\.(ts|[cm]?js|svelte|css)$/.test(path) ? "vendor-private" : "asset", owner: `vendor.${family}` };
  }
  if (!/\.(ts|[cm]?js|svelte|css)$/.test(path)) return { role: "asset", owner: "unqualified-asset" };
  if (adapters.has(path) || path.startsWith("src/build/svelte/")) return { role: "adapter", owner: "renderer" };
  if (path.endsWith(".css") || path.includes("/catalog/") && path.endsWith(".ts")) {
    return { role: "mechanism", owner: `candidate:${stem}` };
  }
  if (path.endsWith(".ts")) return { role: "data", owner: "renderer-data" };
  return { role: primitives.has(stem.replace(/^pieces\//, "")) ? "primitive" : "composition", owner: `candidate:${stem}` };
}
