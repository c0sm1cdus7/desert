import test from "node:test";
import assert from "node:assert/strict";
import type { Locator, Page } from "playwright";
import { activePanel, browserFixture, panelToolbar, settleMotion, waitForNote } from "./fixture.ts";

type Dismissal = "top" | "bottom" | "escape" | "overlay";
const title = "An existing thought";
const body = "Reading should resume where I left it.\n\n".repeat(45);
const draft = { title: "An unfinished thought", body: "Keep these unsaved words exactly.\n\nAnd this paragraph." };

async function dismiss(page: Page, dialog: Locator, method: Dismissal) {
  await dialog.waitFor();
  await settleMotion(page);
  if (method === "escape") await page.keyboard.press("Escape");
  else if (method === "overlay") {
    const overlay = await page.locator('[data-slot="dialog-overlay"]').boundingBox();
    assert.ok(overlay);
    await page.mouse.click(overlay.x + 8, overlay.y + 80);
  }
  else await dialog.locator(`[data-surface-slot="${method}"]`).getByRole("button", { name: "Close", exact: true }).click();
  await dialog.getByRole("textbox", { name: "Title", exact: true }).waitFor({ state: "hidden" });
  await settleMotion(page);
}

async function seed(f: Awaited<ReturnType<typeof browserFixture>>) {
  const run = await f.session.begin("create-note");
  const prepared = await f.session.prepare(run.id, { title, body });
  await f.session.accept(prepared.id, prepared.confirmationDigest);
  await f.page.reload();
}

async function retainDraft(dialog: Locator) {
  assert.equal(await dialog.getByRole("textbox", { name: "Title", exact: true }).inputValue(), draft.title);
  assert.equal(await dialog.getByRole("textbox", { name: "Content", exact: true }).inputValue(), draft.body);
}

for (const method of ["top", "bottom", "escape", "overlay"] as const) {
  test(`cancelling Create with ${method} returns to the same reading position and keeps the draft`, { timeout: 30000 }, async () => {
    const f = await browserFixture();
    try {
      await f.page.setViewportSize({ width: 1600, height: 1000 });
      await seed(f);
      await f.page.getByRole("button", { name: new RegExp(title) }).click();
      const reading = activePanel(f.page);
      await waitForNote(f.page, title);
      const scroll = reading.locator('[data-surface-slot="content"]');
      await scroll.evaluate(element => element.scrollTo({ top: 120, behavior: "instant" }));
      const create = f.page.getByRole("button", { name: "Create note", exact: true }).first();
      const before = await scroll.evaluate(element => element.scrollTop);
      assert.ok(before >= 80, "the test starts from a nonzero reading position with Create in view");
      await create.click();
      const dialog = activePanel(f.page);
      await dialog.getByRole("textbox", { name: "Title", exact: true }).fill(draft.title);
      await dialog.getByRole("textbox", { name: "Content", exact: true }).fill(draft.body);
      if (method === "overlay") await f.page.setViewportSize({ width: 1280, height: 1000 });
      await dismiss(f.page, dialog, method);
      await waitForNote(f.page, title);
      assert.equal(await reading.isVisible(), true, "cancelling creation must not navigate away from the originating note");
      assert.equal(await reading.locator('[data-toolbar-title]').getByText(title, { exact: true }).count(), 1);
      const after = await scroll.evaluate(element => element.scrollTop);
      assert.ok(Math.abs(after - before) <= 1, `reading position must remain ${before}, received ${after}`);
      await f.page.setViewportSize({ width: 1600, height: 1000 });
      await create.click();
      await retainDraft(dialog);
      await settleMotion(f.page);
      assert.equal(await dialog.locator('[data-surface-frame]').evaluate(node => node === document.activeElement), true,
        "an explicit main Create enters the new frame even when its pane was already open");
      await dismiss(f.page, dialog, "escape");
      const records = await f.session.read((await f.session.begin("read-note")).id);
      assert.equal(records.length, 1, "cancellation never creates a record");
      const [detail] = await f.session.read((await f.session.begin("read-note", records[0]!.id)).id);
      assert.equal(detail!.facts.body, body, "the originating note is unchanged");
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  });
}

test("Create started from the collection returns there and retains the draft on every dismissal", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await seed(f);
    await f.page.getByRole("button", { name: new RegExp(title) }).click();
    await waitForNote(f.page, title);
    await panelToolbar(f.page, "top").getByRole("button", { name: "Close", exact: true }).click();
    await activePanel(f.page).waitFor({ state: "hidden" });
    const create = f.page.getByRole("button", { name: "Create note", exact: true }).first();
    const dialog = activePanel(f.page);
    for (const method of ["top", "bottom", "escape", "overlay"] as const) {
      await create.click();
      if (method === "top") {
        await dialog.getByRole("textbox", { name: "Title", exact: true }).fill(draft.title);
        await dialog.getByRole("textbox", { name: "Content", exact: true }).fill(draft.body);
      } else await retainDraft(dialog);
      await dismiss(f.page, dialog, method);
      await activePanel(f.page).waitFor({ state: "hidden" });
      assert.equal(await f.page.locator('[data-row-leading="attention"]').isVisible(), true);
      assert.equal(await activePanel(f.page).count(), 0,
        "a previous selected record must not be invented when creation originated in the collection");
    }
    const records = await f.session.read((await f.session.begin("read-note")).id);
    assert.equal(records.length, 1);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("successful creation from reading continues to the new record, not the cancellation origin", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.setViewportSize({ width: 1600, height: 1000 });
    await seed(f);
    await f.page.getByRole("button", { name: new RegExp(title) }).click();
    const reading = activePanel(f.page);
    await waitForNote(f.page, title);
    await f.page.getByRole("button", { name: "Create note", exact: true }).click();
    const dialog = activePanel(f.page);
    await dialog.getByRole("textbox", { name: "Title", exact: true }).fill(draft.title);
    await dialog.getByRole("textbox", { name: "Content", exact: true }).fill(draft.body);
    await dialog.getByRole("button", { name: "Create note", exact: true }).click();
    await waitForNote(f.page, draft.title);
    assert.equal(await reading.locator('[data-surface-frame]').evaluate(node => node === document.activeElement), true);
    const records = await f.session.read((await f.session.begin("read-note")).id);
    assert.equal(records.length, 2);
    for (const expected of [{ title, body }, draft]) {
      const record = records.find(record => record.facts.title === expected.title)!;
      const [detail] = await f.session.read((await f.session.begin("read-note", record.id)).id);
      assert.equal(detail!.facts.body, expected.body);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("closing a no-results overlay returns focus to its toolbar action without removing record openers", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await seed(f);
    const row = f.page.getByRole("button", { name: new RegExp(title) });
    await row.click();
    await waitForNote(f.page, title);
    await panelToolbar(f.page, "top").getByRole("button", { name: "Close", exact: true }).click();
    await activePanel(f.page).waitFor({ state: "hidden" });
    const trigger = f.page.getByRole("button", { name: "Search", exact: true });
    await trigger.click();
    const search = f.page.getByRole("searchbox", { name: "Search read notes", exact: true });
    await search.fill("No matching heading");
    await f.page.getByText("No matching results", { exact: true }).waitFor();
    assert.equal(await f.page.locator('[data-row-leading="attention"]').count(), 1, "overlay retrieval does not filter its underlying collection");
    await f.page.getByRole("button", { name: "Close search", exact: true }).click();
    await settleMotion(f.page);
    assert.equal(await trigger.evaluate(node => node === document.activeElement), true,
      "dismissal restores the toolbar search action, not a removed overlay control");
    await row.press("Enter");
    await waitForNote(f.page, title);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
