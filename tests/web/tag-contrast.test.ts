import test from "node:test";
import assert from "node:assert/strict";
import AxeBuilder from "@axe-core/playwright";
import { browserFixture, settleMotion } from "./fixture.ts";

test("all shared label tones retain readable text in light and dark", async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click();
    for (const colorScheme of ["light", "dark"] as const) {
      await f.page.emulateMedia({ colorScheme }); await settleMotion(f.page);
      assert.equal(await f.page.locator('[data-control="tag"]').count(), 5);
      const result = await new AxeBuilder({ page: f.page }).include('[data-control="tag"]')
        .withRules(["color-contrast"]).analyze();
      assert.deepEqual(result.violations.map(rule => ({ id: rule.id,
        nodes: rule.nodes.map(node => ({ target: node.target, failure: node.failureSummary })) })), [], colorScheme);
    }
  } finally { await f.close(); }
});
