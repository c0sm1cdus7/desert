import test from "node:test";
import assert from "node:assert/strict";
import { browserFixture, settleMotion } from "./fixture.ts";

test("every review dismissal returns to its unchanged object and originating action", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    const run = await f.session.begin("create-note");
    const prepared = await f.session.prepare(run.id, { title: "Keep my place", body: "Cancellation must not lose reading context." });
    await f.session.accept(prepared.id, prepared.confirmationDigest);
    await f.page.reload();
    await f.page.getByRole("button", { name: /Keep my place/ }).click();
    const context = f.page.getByRole("region", { name: "Object context", exact: true });
    const archive = context.getByRole("button", { name: "Archive note", exact: true });
    for (const dismissal of ["top", "bottom", "escape", "overlay"] as const) {
      await archive.click();
      const dialog = f.page.getByRole("dialog", { name: "Archive note", exact: true });
      await dialog.waitFor();
      await settleMotion(f.page);
      if (dismissal === "escape") await f.page.keyboard.press("Escape");
      else if (dismissal === "overlay") await f.page.mouse.click(10, 100);
      else await dialog.locator(`[data-surface-slot="${dismissal}"]`).getByRole("button", { name: "Back", exact: true }).click();
      await dialog.waitFor({ state: "hidden" });
      assert.equal(await context.isVisible(), true, `${dismissal} preserves the object context`);
      assert.equal(await archive.evaluate(node => document.activeElement === node), true, `${dismissal} restores the originating action`);
      const records = await f.session.read((await f.session.begin("read-note")).id);
      assert.equal(records[0]!.facts.state, "active", "dismissal never accepts the prepared mutation");
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("successful create and archive move keyboard focus to the resulting object", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.setViewportSize({ width: 390, height: 844 });
    await f.page.getByRole("button", { name: "Create note", exact: true }).click();
    await f.page.getByRole("textbox", { name: "Title", exact: true }).fill("A clear continuation");
    await f.page.getByRole("textbox", { name: "Content", exact: true }).fill("Stay with the object after saving.");
    await f.page.locator("form").getByRole("button", { name: "Create note", exact: true }).click();
    const context = f.page.getByRole("region", { name: "Object context", exact: true });
    await context.waitFor();
    await f.page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(await context.evaluate(node => node === document.activeElement), true, "creation lands on the resulting reading region");
    await f.page.keyboard.press("Tab");
    assert.equal(await context.getByRole("button", { name: "Back", exact: true }).evaluate(node => node === document.activeElement), true);
    await context.getByRole("button", { name: "Archive note", exact: true }).click();
    await f.page.getByRole("dialog").getByRole("button", { name: "Archive note", exact: true }).click();
    await f.page.getByRole("dialog").waitFor({ state: "hidden" });
    await context.getByText("archived", { exact: true }).waitFor();
    assert.equal(await context.evaluate(node => node === document.activeElement), true, "archive does not return focus to its now-disabled action");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
