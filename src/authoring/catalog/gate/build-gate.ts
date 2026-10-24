// Entry of the Visual Catalog gate on the build path. It imports only rule P statically: P proves every gate module is
// present, then the rule modules load, so deleting one is reported as CATALOG_GATE_SOURCES instead of a crash or a pass.
// Order: P; the structural rules A, B, C, L (first error); the content rules (every violation, one failure); the worker;
// then G2 on the CSS the worker emitted, before anything is copied out.
import { assertGateSources } from "./sources.ts";
import { DesertLayout } from "../layout.ts";

/** What a qualified build records: the gate that passed (plan 3.5). The tree it passed is `renderer.revision`. */
export const catalogGateEvidence = Object.freeze({ version: "desert.catalog-gate/1" } as const);

/** No build or check worker runs after a catalog rule is violated.
 * `emitted`, for a build: the CSS the worker wrote, checked by rule G2 before anything is copied out. */
export async function runWithCatalogGate<T>(root: string, operation: () => Promise<T>,
  emitted?: () => Promise<readonly Readonly<{ path: string; source: string }>[]>): Promise<T> {
  await assertGateSources(root, DesertLayout, "gate");
  const [{ runCatalogGate, contentViolations }, { contentRuleIds }, { CatalogGateViolations }] = await Promise.all([
    import("./run.ts"), import("./content-rules.ts"), import("./violation.ts")]);
  const tree = await runCatalogGate(root, { layout: DesertLayout, rules: ["A", "B", "C", "L"] });
  const { context, violations } = await contentViolations(root, tree, { layout: DesertLayout, rules: contentRuleIds });
  if (violations.length) throw new CatalogGateViolations(violations);
  const result = await operation();
  if (emitted) {
    const { emittedCssViolations } = await import("./emitted-css.ts");
    const found = emittedCssViolations({ cssFiles: await emitted(), context });
    if (found.length) throw new CatalogGateViolations(found);
  }
  return result;
}
