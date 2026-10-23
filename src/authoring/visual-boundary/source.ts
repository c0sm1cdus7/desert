// Entry of the visual gate on the build path. It imports only rule P statically: P proves every gate module is present,
// then the rule modules load, so deleting one is reported as CATALOG_GATE_SOURCES instead of a crash or a silent pass.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assertGateSources } from "../catalog/gate/sources.ts";
import { DesertLayout } from "../catalog/layout.ts";

/** Same source scope for inspection and build enforcement, including dormant CSS.
 * This closes only the migrated families; it does not certify legacy ownership.
 */
export async function readVisualBoundarySources(root: string) {
  const { inventoryVisualSources } = await import("./inventory.ts");
  const inventory = await inventoryVisualSources(root);
  return await Promise.all(inventory.sources.filter(item => /\.(svelte|css|ts)$/.test(item.path))
    .map(async item => ({ path: item.path, source: await readFile(resolve(root, item.path), "utf8") })));
}

/** No build/check worker runs after a catalog rule or a migrated boundary is violated. */
export async function runWithVisualBoundaries<T>(root: string, operation: () => Promise<T>): Promise<T> {
  await assertGateSources(root, DesertLayout);
  const { runCatalogGate } = await import("../catalog/gate/run.ts");
  const tree = await runCatalogGate(root, { layout: DesertLayout, rules: ["A", "B", "C", "L"] });
  // The previous gate, until slice 1 ports each assertion into a catalog rule.
  const [{ assertClosedVisualBoundaries }, { assertCompleteAdapterSources }, { assertCompleteDispatcherSources },
    { assertCompleteBootstrapSources }, { assertNonvisualDependencies }, { assertWebCatalogDerivations }] = await Promise.all([
    import("./closed.ts"), import("./adapter.ts"), import("./dispatch-contract.ts"), import("./bootstrap.ts"),
    import("./dependency-graph.ts"), import("../web-catalog/check.ts")]);
  const sources = await readVisualBoundarySources(root);
  assertCompleteAdapterSources(sources);
  assertCompleteDispatcherSources(sources);
  assertCompleteBootstrapSources(sources);
  assertWebCatalogDerivations(sources);
  assertClosedVisualBoundaries(sources);
  await assertNonvisualDependencies(root, sources);
  // Content rules D–T, after the previous gate so its own codes stay visible: every violation, one failure (Q1).
  const { runContentRules } = await import("../catalog/gate/run.ts"), { contentRuleIds } = await import("../catalog/gate/content-rules.ts");
  await runContentRules(root, tree, { layout: DesertLayout, rules: contentRuleIds });
  return await operation();
}
