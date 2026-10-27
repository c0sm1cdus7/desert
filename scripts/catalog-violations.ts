// Prints the content-rule violations of this tree by code, with a few examples each: node scripts/catalog-violations.ts [RULE...]
// A diagnostic for migration work; the build runs the same rules through runWithCatalogGate and fails on any.
import { resolve } from "node:path";
import { readCatalogTree, runContentRules } from "../src/authoring/catalog/gate/run.ts";
import { contentRuleIds } from "../src/authoring/catalog/gate/content-rules.ts";
import { DesertLayout } from "../src/authoring/catalog/layout.ts";
import { CatalogGateViolations, formatViolation } from "../src/authoring/catalog/gate/violation.ts";

const root = resolve(import.meta.dirname, "..");
const requested = process.argv.slice(2);
const rules = requested.length ? contentRuleIds.filter(id => requested.includes(id)) : contentRuleIds;
if (rules.length !== (requested.length || contentRuleIds.length)) throw new Error(`CATALOG_VIOLATIONS_USAGE: rules are ${contentRuleIds.join(" ")}`);
const examples = Number(process.env.EXAMPLES ?? 3);
try {
  await runContentRules(root, await readCatalogTree(root, DesertLayout), { layout: DesertLayout, rules });
  console.log(`No violations for rules ${rules.join(",")}.`);
} catch (error) {
  if (!(error instanceof CatalogGateViolations)) throw error;
  console.log(error.message.split("\n")[0]);
  const byCode = new Map<string, string[]>();
  for (const item of error.violations) byCode.set(item.code, [...byCode.get(item.code) ?? [], formatViolation(item)]);
  for (const [code, lines] of byCode) { console.log(`\n${code} (${lines.length})`); for (const line of lines.slice(0, examples)) console.log(`  ${line}`); }
  process.exitCode = 1;
}
