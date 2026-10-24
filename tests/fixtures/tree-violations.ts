// The content-rule findings of the DESERT tree under some paths, formatted as the gate prints them: a foundation test
// asserts its own folder is clean without depending on the debt of pieces other lanes still migrate.
import { fileURLToPath } from "node:url";
import { readCatalogTree, contentViolations } from "../../src/authoring/catalog/gate/run.ts";
import type { ContentRuleId } from "../../src/authoring/catalog/gate/content-rules.ts";
import { DesertLayout } from "../../src/authoring/catalog/layout.ts";
import { formatViolation } from "../../src/authoring/catalog/gate/violation.ts";

const root = fileURLToPath(new URL("../..", import.meta.url));

/** Every finding of `rules` whose file starts with one of `prefixes`. */
export async function treeViolations(prefixes: readonly string[], rules: readonly ContentRuleId[]): Promise<string[]> {
  const { violations } = await contentViolations(root, await readCatalogTree(root, DesertLayout), { layout: DesertLayout, rules });
  return violations.filter(item => prefixes.some(prefix => item.path.startsWith(prefix))).map(formatViolation);
}
