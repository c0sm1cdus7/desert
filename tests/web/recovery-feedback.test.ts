import assert from "node:assert/strict";
import test from "node:test";
import { activePanel, browserFixture, panelToolbar, settleMotion, waitForNote } from "./fixture.ts";

function gate() {
  let release = () => {};
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
}

test("receipt feedback stays in recovery and each pending control identifies its own operation", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  const receiptGate = gate(), receiptArrived = gate(), acceptGate = gate(), acceptArrived = gate();
  try {
    const attempts: unknown[] = [];
    await f.page.route("**/api/accept", async route => {
      attempts.push(route.request().postDataJSON());
      if (attempts.length === 1) { await route.abort("failed"); return; }
      const response = await route.fetch();
      acceptArrived.release();
      await acceptGate.promise;
      await route.fulfill({ response });
    });
    await f.page.route("**/api/receipt", async route => {
      const response = await route.fetch();
      assert.equal(await response.json(), null);
      receiptArrived.release();
      await receiptGate.promise;
      await route.fulfill({ response });
    });
    await f.page.getByRole("button", { name: "Create note", exact: true }).first().click();
    await f.page.getByRole("textbox", { name: "Title", exact: true }).fill("Recover one operation");
    await f.page.getByRole("textbox", { name: "Content", exact: true }).fill("Keep feedback with this confirmation.");
    await panelToolbar(f.page, "bottom").getByRole("button", { name: "Create note", exact: true }).click();
    const failure = f.page.getByRole("dialog", { name: "The result isn’t confirmed", exact: true });
    await failure.waitFor();
    assert.match(await failure.innerText(), /not known yet/);
    assert.doesNotMatch(await failure.innerText(), /couldn’t complete|No change was accepted/);
    await failure.locator('[data-surface-slot="bottom"]').getByRole("button", { name: "Close", exact: true }).click();
    await failure.waitFor({ state: "hidden" });
    const recovery = activePanel(f.page);
    const check = recovery.locator('[data-surface-slot="top"]').getByRole("button", { name: "Check result", exact: true });
    const retry = recovery.locator('[data-surface-slot="bottom"]').getByRole("button", { name: "Retry same confirmation", exact: true });
    await check.click();
    await receiptArrived.promise;
    assert.equal(await check.getAttribute("aria-busy"), "true");
    assert.equal(await retry.getAttribute("aria-busy"), "false");
    assert.equal(await retry.isDisabled(), true);
    assert.equal(attempts.length, 1, "a receipt check must not accept an operation");
    receiptGate.release();
    const feedback = recovery.locator('[data-surface-slot="content"]').getByText(
      "No saved result was found for this confirmation. Check again or retry this same confirmation.", { exact: true });
    await feedback.waitFor();
    assert.equal(await feedback.getAttribute("role"), "status");
    assert.equal(await check.getAttribute("aria-busy"), "false");
    assert.equal(await retry.isEnabled(), true);
    const cdp = await f.context.newCDPSession(f.page);
    for (const width of [1280, 390]) {
      await f.page.setViewportSize({ width, height: 900 });
      for (const transparency of ["reduce", "no-preference"]) {
        await cdp.send("Emulation.setEmulatedMedia", { features: [
          { name: "prefers-reduced-transparency", value: transparency },
          { name: "prefers-reduced-motion", value: "reduce" },
        ] });
        await settleMotion(f.page);
        assert.equal(await feedback.isVisible(), true);
        assert.equal(await feedback.evaluate(node => {
          const rect = node.getBoundingClientRect();
          const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
          return hit === node || (!!hit && node.contains(hit));
        }), true, `recovery feedback is not occluded at ${width}px / ${transparency}`);
      }
    }
    await retry.click();
    await acceptArrived.promise;
    assert.equal(await retry.getAttribute("aria-busy"), "true");
    assert.equal(await check.getAttribute("aria-busy"), "false");
    assert.equal(await check.isDisabled(), true);
    assert.deepEqual(attempts[1], attempts[0]);
    acceptGate.release();
    await waitForNote(f.page, "Recover one operation");
    const notes = await f.session.read((await f.session.begin("read-note")).id);
    assert.equal(notes.length, 1);
    assert.equal(notes[0]!.facts.title, "Recover one operation");
    assert.deepEqual(f.errors, []);
  } finally { receiptGate.release(); acceptGate.release(); await f.close(); }
});
