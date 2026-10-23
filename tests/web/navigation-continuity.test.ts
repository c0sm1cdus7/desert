import test from "node:test";
import assert from "node:assert/strict";
import { activePanel, browserFixture, panelToolbar, settleMotion, waitForNote } from "./fixture.ts";

test("every review dismissal returns to its unchanged object and originating action", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    const run = await f.session.begin("create-note");
    const prepared = await f.session.prepare(run.id, { title: "Keep my place", body: "Cancellation must not lose reading context." });
    await f.session.accept(prepared.id, prepared.confirmationDigest);
    await f.page.reload();
    await f.page.getByRole("button", { name: /Keep my place/ }).click();
    const context = activePanel(f.page);
    await waitForNote(f.page, "Keep my place");
    const archive = panelToolbar(f.page, "top").getByRole("button", { name: "Archive note", exact: true });
    for (const dismissal of ["top", "bottom", "escape", "overlay"] as const) {
      await archive.click();
      const dialog = activePanel(f.page);
      await dialog.locator('[data-toolbar-title]').getByText("Review · Archive note", { exact: true }).waitFor();
      await dialog.waitFor();
      await settleMotion(f.page);
      if (dismissal === "escape") await f.page.keyboard.press("Escape");
      else if (dismissal === "overlay") {
        const overlay = await f.page.locator('[data-slot="dialog-overlay"]').boundingBox();
        assert.ok(overlay); await f.page.mouse.click(overlay.x + 8, overlay.y + 80);
      }
      else await dialog.locator(`[data-surface-slot="${dismissal}"]`).getByRole("button", { name: "Back", exact: true }).click();
      await waitForNote(f.page, "Keep my place");
      assert.equal(await context.isVisible(), true, `${dismissal} preserves the object context`);
      assert.equal(await archive.evaluate(node => document.activeElement === node), true, `${dismissal} restores the originating action`);
      const records = await f.session.read((await f.session.begin("read-note")).id);
      assert.equal(records[0]!.facts.state, "active", "dismissal never accepts the prepared mutation");
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

for (const width of [390, 1280, 1600]) test(`successful create and archive move keyboard focus to the resulting object at ${width}px`, { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.setViewportSize({ width, height: 1000 });
    await f.page.getByRole("button", { name: "Create note", exact: true }).click();
    await f.page.getByRole("textbox", { name: "Title", exact: true }).fill("A clear continuation");
    await f.page.getByRole("textbox", { name: "Content", exact: true }).fill("Stay with the object after saving.");
    await panelToolbar(f.page, "bottom").getByRole("button", { name: "Create note", exact: true }).click();
    const context = activePanel(f.page);
    await waitForNote(f.page, "A clear continuation");
    assert.equal(await context.locator('[data-surface-frame]').evaluate(node => node === document.activeElement), true,
      "creation lands on the resulting reading frame, without reopening its adaptive surface");
    await f.page.keyboard.press("Tab");
    assert.equal(await panelToolbar(f.page, "top").getByRole("button", { name: "Close", exact: true }).evaluate(node => node === document.activeElement), true);
    await context.getByRole("button", { name: "Archive note", exact: true }).click();
    await panelToolbar(f.page, "bottom").getByRole("button", { name: "Archive note", exact: true }).click();
    await waitForNote(f.page, "A clear continuation");
    await context.getByText("archived", { exact: true }).waitFor();
    assert.equal(await context.locator('[data-surface-frame]').evaluate(node => node === document.activeElement), true,
      "archive does not return focus to its now-disabled action");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a delayed read never steals focus from a later main-view destination", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  let release = () => {}, arrived = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  const pending = new Promise<void>(resolve => { arrived = resolve; });
  try {
    await f.page.setViewportSize({ width: 1600, height: 1000 });
    let delayedSubject = "";
    for (const title of ["First context", "Later context"]) {
      const run = await f.session.begin("create-note");
      const prepared = await f.session.prepare(run.id, { title, body: "A complete published reading." });
      const receipt = await f.session.accept(prepared.id, prepared.confirmationDigest);
      delayedSubject = receipt.object.id;
    }
    await f.page.reload();
    await f.page.getByRole("button", { name: /First context/ }).click();
    await waitForNote(f.page, "First context");
    await f.page.route("**/api/begin", async route => {
      const input = route.request().postDataJSON();
      if (input.journeyId !== "read-note" || input.subject !== delayedSubject) { await route.continue(); return; }
      const response = await route.fetch(); arrived(); await gate; await route.fulfill({ response });
    });
    await f.page.getByRole("button", { name: /Later context/ }).click();
    await pending;
    const main = f.page.getByRole("button", { name: "Create note", exact: true });
    await main.focus();
    release();
    await waitForNote(f.page, "Later context");
    assert.equal(await main.evaluate(node => node === document.activeElement), true,
      "the new focus destination wins over the earlier read activation");
    assert.deepEqual(f.errors, []);
  } finally { release(); await f.close(); }
});
