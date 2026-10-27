import test from "node:test";
import assert from "node:assert/strict";
import { gapNote, inspectionFixture as browserFixture, openCatalog } from "./inspection-fixture.ts";
import { waitForEnabled } from "./fixture.ts";

test("real product forms use the compiled validator and controller availability, never a specimen name", async () => {
  const f = await browserFixture();
  try {
    await openCatalog(f.page);
    assert.equal(await f.page.locator('[data-view-item="specimen:form:ready"]').locator(gapNote).count(), 1, "the form specimen is a coverage gap");
    await f.page.getByRole("button", { name: "Notes", exact: true }).click();
    await f.page.getByRole("button", { name: "Create note", exact: true }).click();
    const form = f.page.getByRole("dialog", { name: "Create note", exact: true });
    const save = form.getByRole("button", { name: "Create note", exact: true });
    const title = form.getByRole("textbox", { name: "Title", exact: true });
    const body = form.getByRole("textbox", { name: "Content", exact: true });
    await waitForEnabled(save, false);
    await title.fill("Title"); await body.fill("Body"); await waitForEnabled(save);
    await title.fill(""); await waitForEnabled(save, false);
    await title.fill("Restored"); await waitForEnabled(save);
    await f.page.route("**/api/availability", route => route.abort());
    await waitForEnabled(save, false);
    await title.fill("Retained"); await body.fill("Retained");
    assert.equal(await save.isDisabled(), true);
    assert.equal(await title.inputValue(), "Retained"); assert.equal(await body.inputValue(), "Retained");
    await f.page.unroute("**/api/availability"); await waitForEnabled(save);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("an unread collection is not presented as known empty", async () => {
  const f = await browserFixture();
  try {
    await f.page.route("**/api/read", route => route.abort());
    await f.page.reload();
    await f.page.getByRole("heading", { name: "Waiting for your records." }).waitFor();
    assert.equal(await f.page.getByRole("heading", { name: "Nothing here yet." }).count(), 0);
    assert.equal(await f.page.locator('.collection-heading > span').count(), 0, "unknown count is not displayed as zero");
  } finally { await f.close(); }
});
