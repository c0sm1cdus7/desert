// A content rule's finding. Content rules (D–U) report every violation; the gate then fails once with the full list,
// so the owner sees the whole debt in one build (Q1). Structural rules (P, A, B, C, L) still stop at the first error.
export type Violation = Readonly<{ code: string; path: string; line: number; what: string }>;

export const violation = (code: string, path: string, line: number, what: string): Violation => Object.freeze({ code, path, line, what });

/** `CODE: path:line: what`, the one format every gate message uses; line 0 means the finding has no line (`CODE: path: what`). */
export const formatViolation = (item: Violation) => `${item.code}: ${item.path}${item.line > 0 ? `:${item.line}` : ""}: ${item.what}`;

const order = (left: Violation, right: Violation) =>
  left.path < right.path ? -1 : left.path > right.path ? 1 : left.line - right.line || (left.code < right.code ? -1 : left.code > right.code ? 1 : 0);

export class CatalogGateViolations extends Error {
  readonly violations: readonly Violation[];
  constructor(violations: readonly Violation[]) {
    const sorted = [...violations].sort(order), counts = new Map<string, number>();
    for (const item of sorted) counts.set(item.code, (counts.get(item.code) ?? 0) + 1);
    const summary = [...counts].sort(([left], [right]) => left < right ? -1 : 1).map(([code, count]) => `${code} ${count}`).join(", ");
    super(`CATALOG_GATE: ${sorted.length} violations (${summary})\n${sorted.map(formatViolation).join("\n")}`);
    this.name = "CatalogGateViolations";
    this.violations = Object.freeze(sorted);
  }
}
