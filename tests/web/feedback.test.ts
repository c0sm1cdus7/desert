import test from "node:test";
import assert from "node:assert/strict";
import { settleMotion } from "./fixture.ts";
import { inspectionFixture as browserFixture, openCatalog } from "./inspection-fixture.ts";
import { mkdir } from "node:fs/promises";

test("feedback uses semantic colors and destination rows never shrink out of their well", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await openCatalog(f.page);
    for (const colorScheme of ["light", "dark"] as const) {
      await f.page.emulateMedia({ colorScheme });
      assert.equal(await f.page.locator('[data-specimen="availability:unknown"] svg').evaluate(node =>
        getComputedStyle(node).color === getComputedStyle(node.closest('[data-primitive="availability"]')!).color), true,
        "unknown availability inherits neutral status text; uncertainty does not claim readiness or a primary action");
      for (const [specimen, token] of [["availability:ready", "--positive"], ["availability:unavailable", "--warning"]]) {
        const icon = f.page.locator(`[data-specimen="${specimen}"] svg`);
        const matches = await icon.evaluate((node, token) => {
          const probe = document.createElement("span"); probe.style.color = `var(${token})`;
          node.parentElement!.append(probe);
          const same = getComputedStyle(node).color === getComputedStyle(probe).color;
          probe.remove(); return same;
        }, token!);
        assert.equal(matches, true, `${specimen} follows ${token}`);
      }
      assert.equal(await f.page.locator('[data-specimen="action:pending"] button').evaluate(button =>
        getComputedStyle(button.querySelector("svg")!).color === getComputedStyle(button).color), true,
        "pending icons inherit the button foreground, not a separate accent");
      for (const [severity, token] of [["error", "--destructive"], ["warning", "--warning"]]) {
        await f.page.locator(`[data-specimen="problem:${severity}"]`).getByRole("button").click();
        const dialog = f.page.getByRole("dialog");
        assert.equal(await dialog.locator('[data-surface-slot="top"] [data-piece="face"] svg').evaluate((node, token) => {
          const probe = document.createElement("span"); probe.style.color = `var(${token})`;
          node.parentElement!.append(probe);
          const same = getComputedStyle(node).color === getComputedStyle(probe).color;
          probe.remove(); return same;
        }, token!), true);
        await dialog.locator('[data-surface-slot="bottom"]').getByRole("button", { name: "Close", exact: true }).click();
        await dialog.waitFor({ state: "hidden" });
      }
    }
    for (const title of ["First row", "Middle row", "Last row"]) {
      const run = await f.session.begin("create-note");
      const prepared = await f.session.prepare(run.id, { title, body: "A real published record." });
      await f.session.accept(prepared.id, prepared.confirmationDigest);
    }
    await f.page.getByRole("button", { name: "Notes", exact: true }).click();
    const rows = f.page.locator('[data-catalog-content] [data-row-leading="attention"]:visible');
    await rows.nth(2).waitFor();
    await settleMotion(f.page);
    assert.equal(await rows.count(), 3);
    for (const row of await rows.all()) {
      const before = (await row.boundingBox())!;
      await row.hover(); await f.page.mouse.down();
      await settleMotion(f.page);
      const during = (await row.boundingBox())!;
      assert.deepEqual(during, before, "press cannot expose rectangular edges or detach row separators");
      assert.equal(await row.evaluate(node => getComputedStyle(node).transform), "none");
      await f.page.mouse.move(0, 0); await f.page.mouse.up();
    }
    const corners = await rows.evaluateAll(nodes => nodes.map(node => ({
      top: parseFloat(getComputedStyle(node).borderTopLeftRadius), bottom: parseFloat(getComputedStyle(node).borderBottomLeftRadius),
    })));
    assert.ok(corners[0]!.top > 0 && corners[0]!.bottom === 0);
    assert.ok(corners[1]!.top === 0 && corners[1]!.bottom === 0);
    assert.ok(corners[2]!.top === 0 && corners[2]!.bottom > 0);
    await mkdir("artifacts/typed-bank", { recursive: true });
    await f.page.screenshot({ path: "artifacts/typed-bank/action-list.png" });
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
