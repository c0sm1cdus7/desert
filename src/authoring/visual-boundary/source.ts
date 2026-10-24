// Entry of the visual gate on the build path. It imports only rule P statically: P proves every gate module is present,
// then the rule modules load, so deleting one is reported as CATALOG_GATE_SOURCES instead of a crash or a silent pass.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assertGateSources } from "../catalog/gate/sources.ts";
import { DesertLayout } from "../catalog/layout.ts";
import type { Violation } from "../catalog/gate/violation.ts";

/** Same source scope for inspection and build enforcement, including dormant CSS.
 * This closes only the migrated families; it does not certify legacy ownership.
 */
export async function readVisualBoundarySources(root: string) {
  const { inventoryVisualSources } = await import("./inventory.ts");
  const inventory = await inventoryVisualSources(root);
  return await Promise.all(inventory.sources.filter(item => /\.(svelte|css|ts)$/.test(item.path))
    .map(async item => ({ path: item.path, source: await readFile(resolve(root, item.path), "utf8") })));
}

/** The previous visual-boundary gate alone, as violations (it stops at its first error, so at most one). Kept on the
 * build path until each assertion is ported to a catalog rule; its own tests call it directly. */
export async function previousGateViolations(root: string): Promise<readonly Violation[]> {
  const [{ assertClosedVisualBoundaries }, { assertCompleteAdapterSources }, { assertCompleteDispatcherSources },
    { assertCompleteBootstrapSources }, { assertNonvisualDependencies }, { assertWebCatalogDerivations }, { violation }] = await Promise.all([
    import("./closed.ts"), import("./adapter.ts"), import("./dispatch-contract.ts"), import("./bootstrap.ts"),
    import("./dependency-graph.ts"), import("../web-catalog/check.ts"), import("../catalog/gate/violation.ts")]);
  try {
    const sources = await readVisualBoundarySources(root);
    assertCompleteAdapterSources(sources);
    assertCompleteDispatcherSources(sources);
    assertCompleteBootstrapSources(sources);
    assertWebCatalogDerivations(sources);
    assertClosedVisualBoundaries(sources);
    await assertNonvisualDependencies(root, sources);
    return [];
  } catch (error) {
    const coded = error instanceof Error ? /^([A-Z][A-Z0-9_]+): (?:(src\/[^:\s]+): )?([\s\S]*)$/.exec(error.message) : null;
    if (!coded) throw error;
    return [violation(coded[1] ?? "", coded[2] ?? "src", 0, coded[3] ?? "")];
  }
}

/** What a qualified build records: the gate that passed (plan 3.5). The tree it passed is `renderer.revision`. */
export const catalogGateEvidence = Object.freeze({ version: "desert.catalog-gate/1" } as const);

/** No build/check worker runs after a catalog rule or a migrated boundary is violated.
 * `emitted`, for a build: the CSS the worker wrote, checked by rule G2 before anything is copied out. */
export async function runWithVisualBoundaries<T>(root: string, operation: () => Promise<T>,
  emitted?: () => Promise<readonly Readonly<{ path: string; source: string }>[]>): Promise<T> {
  await assertGateSources(root, DesertLayout);
  const { runCatalogGate } = await import("../catalog/gate/run.ts");
  const tree = await runCatalogGate(root, { layout: DesertLayout, rules: ["A", "B", "C", "L"] });
  const [{ contentViolations }, { contentRuleIds }, { CatalogGateViolations }] = await Promise.all([
    import("../catalog/gate/run.ts"), import("../catalog/gate/content-rules.ts"), import("../catalog/gate/violation.ts")]);
  // The previous gate stops at its first error; that error joins the content rules' list, so both always run.
  const previous = await previousGateViolations(root);
  // Content rules D–T: every violation, one failure (Q1).
  const { context, violations: content } = await contentViolations(root, tree, { layout: DesertLayout, rules: contentRuleIds });
  if (previous.length || content.length) throw new CatalogGateViolations([...previous, ...content]);
  const result = await operation();
  if (emitted) {
    const { emittedCssViolations } = await import("../catalog/gate/emitted-css.ts");
    const violations = emittedCssViolations({ cssFiles: await emitted(), context });
    if (violations.length) throw new CatalogGateViolations(violations);
  }
  return result;
}
