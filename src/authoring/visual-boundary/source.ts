import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { inventoryVisualSources } from "./inventory.ts";
import { assertClosedVisualBoundaries } from "./closed.ts";
import { assertCompleteAdapterSources } from "./adapter.ts";
import { assertCompleteDispatcherSources } from "./dispatch-contract.ts";
import { assertCompleteBootstrapSources } from "./bootstrap.ts";
import { assertNonvisualDependencies } from "./dependency-graph.ts";
import { assertWebCatalogDerivations } from "../web-catalog/check.ts";

/** Same source scope for inspection and build enforcement, including dormant CSS.
 * This closes only the migrated families; it does not certify legacy ownership.
 */
export async function readVisualBoundarySources(root: string) {
  const inventory = await inventoryVisualSources(root);
  return await Promise.all(inventory.sources.filter(item => /\.(svelte|css|ts)$/.test(item.path))
    .map(async item => ({ path: item.path, source: await readFile(resolve(root, item.path), "utf8") })));
}

/** No build/check worker runs after a migrated boundary is violated. */
export async function runWithVisualBoundaries<T>(root: string, operation: () => Promise<T>): Promise<T> {
  const sources = await readVisualBoundarySources(root);
  assertCompleteAdapterSources(sources);
  assertCompleteDispatcherSources(sources);
  assertCompleteBootstrapSources(sources);
  assertWebCatalogDerivations(sources);
  assertClosedVisualBoundaries(sources);
  await assertNonvisualDependencies(root, sources);
  return await operation();
}
