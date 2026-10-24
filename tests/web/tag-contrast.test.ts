import test from "node:test";
import assert from "node:assert/strict";
import AxeBuilder from "@axe-core/playwright";
import { settleMotion } from "./fixture.ts";
import { inspectionFixture as browserFixture, openCatalog } from "./inspection-fixture.ts";

test("all shared label tones retain readable text in light and dark", async () => {
  const f = await browserFixture();
  try {
    await openCatalog(f.page);
    for (const colorScheme of ["light", "dark"] as const) {
      await f.page.emulateMedia({ colorScheme }); await settleMotion(f.page);
      assert.equal(await f.page.locator('[data-catalog-entry="control.tag"] [data-tag]').count(), 5);
      const result = await new AxeBuilder({ page: f.page }).include('[data-tag]')
        .withRules(["color-contrast"]).analyze();
      assert.deepEqual(result.violations.map(rule => ({ id: rule.id,
        nodes: rule.nodes.map(node => ({ target: node.target, failure: node.failureSummary })) })), [], colorScheme);
    }
  } finally { await f.close(); }
});
