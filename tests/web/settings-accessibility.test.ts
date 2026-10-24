import assert from "node:assert/strict";
import test from "node:test";
import AxeBuilder from "@axe-core/playwright";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { navigationAction, settle } from "./public-catalog-expectations.ts";
import { settingsEvidence } from "./settings-language-expectations.ts";

// A second, independent engine checks actual rendered text/controls in each
// appearance. Theme switching itself is checked in settings-language.test.ts;
// changing the browser preference on a forced-dark page is not light validation.
test("Settings-like content retains accessible labels and contrast in both system appearances", { timeout: 120000 }, async () => {
  const f = await publicCatalogFixture(), failures: unknown[] = [];
  try {
    await f.page.setViewportSize({ width: 1280, height: 900 });
    for (const colorScheme of ["light", "dark"] as const) {
      await f.page.emulateMedia({ colorScheme });
      for (const destination of ["Travel kit", "Component bank"]) {
        await (await navigationAction(f.page, destination)).click(); await settle(f.page);
        const selector = destination === "Travel kit" ? "[data-local-exercises]" : "[data-public-catalog-bank]";
        const result = await new AxeBuilder({ page: f.page }).include(selector).analyze();
        const values = { colorScheme, destination, violations: result.violations,
          incomplete: result.incomplete.map(rule => ({ id: rule.id, nodes: rule.nodes.map(node => node.target) })) };
        await settingsEvidence(f.page, `accessibility-${colorScheme}-${destination.replaceAll(" ", "-")}`, values);
        failures.push(...result.violations.map(rule => ({ colorScheme, destination, id: rule.id,
          nodes: rule.nodes.map(node => ({ target: node.target, failure: node.failureSummary })) })));
      }
    }
    assert.deepEqual(failures, []);
  } finally { await f.close(); }
});

test("shared explorer headings retain page hierarchy when embedded as bank specimens", { timeout: 60000 }, async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width: 1280, height: 900 });
    const home = await f.page.locator("[data-public-hero-title]").evaluate(node => node.tagName);
    const groups = await f.page.locator('[data-view-item] > div:has(> [role="region"]) > div > :is(h1,h2,h3,h4,h5,h6)').evaluateAll(nodes => nodes.map(node => node.tagName));
    await f.page.getByRole("button", { name: "Learn More", exact: true }).click(); await settle(f.page);
    const detail = await f.page.locator('div:has(> [data-view-item="about"]) [data-place-title]').evaluate(node => node.tagName);
    await (await navigationAction(f.page, "Component bank")).click(); await settle(f.page);
    const nested = await f.page.locator("[data-public-catalog-bank]").evaluate(root => ({
      heroes: [...root.querySelectorAll("[data-public-hero-title]")].map(node => node.tagName),
      groups: [...root.querySelectorAll('[data-view-item] > div:has(> [role="region"]) > div > :is(h1,h2,h3,h4,h5,h6)')].map(node => node.tagName),
      details: [...root.querySelectorAll('div:has(> [data-view-item="about"]) [data-place-title]')].map(node => node.tagName),
    }));
    await settingsEvidence(f.page, "heading-hierarchy", { home, groups, detail, nested });
    assert.equal(home, "H1"); assert.equal(detail, "H1");
    assert.ok(groups.length > 0 && groups.every(tag => tag === "H2"));
    assert.ok(nested.heroes.length > 0 && nested.heroes.every(tag => tag === "H4"));
    assert.ok(nested.groups.length > 0 && nested.groups.every(tag => tag === "H5"));
    assert.ok(nested.details.length > 0 && nested.details.every(tag => tag === "H4"));
  } finally { await f.close(); }
});
