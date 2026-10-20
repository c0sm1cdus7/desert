import test from "node:test";
import assert from "node:assert/strict";
import type { Locator, Page } from "playwright";
import { browserFixture, settleMotion } from "./fixture.ts";

type Dismissal = "top" | "bottom" | "escape" | "overlay";
const title = "An existing thought";
const body = "Reading should resume where I left it.\n\n".repeat(45);
const draft = { title: "An unfinished thought", body: "Keep these unsaved words exactly.\n\nAnd this paragraph." };

async function dismiss(page: Page, dialog: Locator, method: Dismissal) {
  await dialog.waitFor();
  await settleMotion(page);
  if (method === "escape") await page.keyboard.press("Escape");
  else if (method === "overlay") await page.mouse.click(10, 100);
  else await dialog.locator(`[data-surface-slot="${method}"]`).getByRole("button", { name: "Back", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
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
      await seed(f);
      await f.page.getByRole("button", { name: new RegExp(title) }).click();
      const reading = f.page.getByRole("region", { name: "Object context", exact: true });
      await reading.getByRole("heading", { name: title, exact: true }).waitFor();
      await f.page.evaluate(() => window.scrollTo({ top: 120, behavior: "instant" }));
      const create = f.page.locator("[data-collection-pane]").getByRole("button", { name: "Create note", exact: true });
      await create.scrollIntoViewIfNeeded();
      const before = await f.page.evaluate(() => window.scrollY);
      assert.ok(before >= 80, "the test starts from a nonzero reading position with Create in view");
      await create.click();
      const dialog = f.page.getByRole("dialog", { name: "Create note", exact: true });
      await dialog.getByRole("textbox", { name: "Title", exact: true }).fill(draft.title);
      await dialog.getByRole("textbox", { name: "Content", exact: true }).fill(draft.body);
      await dismiss(f.page, dialog, method);
      assert.equal(await reading.isVisible(), true, "cancelling creation must not navigate away from the originating note");
      assert.equal(await reading.getByRole("heading", { name: title, exact: true }).count(), 1);
      const after = await f.page.evaluate(() => window.scrollY);
      assert.ok(Math.abs(after - before) <= 1, `reading position must remain ${before}, received ${after}`);
      await create.click();
      await retainDraft(dialog);
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
    await f.page.getByRole("region", { name: "Object context", exact: true })
      .getByRole("button", { name: "Back", exact: true }).click();
    const create = f.page.locator("[data-collection-pane]").getByRole("button", { name: "Create note", exact: true });
    const dialog = f.page.getByRole("dialog", { name: "Create note", exact: true });
    for (const method of ["top", "bottom", "escape", "overlay"] as const) {
      await create.click();
      if (method === "top") {
        await dialog.getByRole("textbox", { name: "Title", exact: true }).fill(draft.title);
        await dialog.getByRole("textbox", { name: "Content", exact: true }).fill(draft.body);
      } else await retainDraft(dialog);
      await dismiss(f.page, dialog, method);
      assert.equal(await f.page.locator("[data-collection-pane]").isVisible(), true);
      assert.equal(await f.page.getByRole("region", { name: "Object context", exact: true }).count(), 0,
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
    await seed(f);
    await f.page.getByRole("button", { name: new RegExp(title) }).click();
    const reading = f.page.getByRole("region", { name: "Object context", exact: true });
    await reading.getByRole("heading", { name: title, exact: true }).waitFor();
    await f.page.getByRole("button", { name: "Create note", exact: true }).click();
    const dialog = f.page.getByRole("dialog", { name: "Create note", exact: true });
    await dialog.getByRole("textbox", { name: "Title", exact: true }).fill(draft.title);
    await dialog.getByRole("textbox", { name: "Content", exact: true }).fill(draft.body);
    await dialog.getByRole("button", { name: "Create note", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    await reading.getByRole("heading", { name: draft.title, exact: true }).waitFor();
    assert.equal(await reading.evaluate(node => node === document.activeElement), true);
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

test("Back focuses collection search when filtering removed the original record opener", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await seed(f);
    const row = f.page.getByRole("button", { name: new RegExp(title) });
    await row.click();
    const reading = f.page.getByRole("region", { name: "Object context", exact: true });
    await reading.getByRole("heading", { name: title, exact: true }).waitFor();
    const search = f.page.getByRole("searchbox", { name: "Search loaded records", exact: true });
    await search.fill("No matching heading");
    await row.waitFor({ state: "hidden" });
    assert.equal(await row.count(), 0, "the original opener is no longer mounted");
    await reading.getByRole("button", { name: "Back", exact: true }).click();
    assert.equal(await search.inputValue(), "No matching heading", "Back preserves the retrieval query");
    assert.equal(await search.evaluate(node => node === document.activeElement), true,
      "Back gives keyboard users a useful destination when the old row is gone");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
