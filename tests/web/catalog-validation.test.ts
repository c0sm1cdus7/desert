import test from "node:test";
import assert from "node:assert/strict";
import { browserFixture } from "./fixture.ts";

test("catalog forms use the compiled validator after editing, not the specimen name", async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click();
    const ready = f.page.locator('[data-specimen="form:ready"]');
    const save = ready.getByRole("button", { name: "Save", exact: true });
    assert.equal(await save.isEnabled(), true);
    await ready.getByRole("textbox", { name: "Title", exact: true }).fill("");
    assert.equal(await save.isDisabled(), true);
    await ready.getByRole("textbox", { name: "Title", exact: true }).fill("Restored");
    assert.equal(await save.isEnabled(), true);
    const incomplete = f.page.locator('[data-specimen="form:incomplete"]');
    await incomplete.getByRole("textbox", { name: "Title", exact: true }).fill("Title");
    await incomplete.getByRole("textbox", { name: "Content", exact: true }).fill("Body");
    assert.equal(await incomplete.getByRole("button", { name: "Save", exact: true }).isEnabled(), true);
    const disconnected = f.page.locator('[data-specimen="form:disconnected"]');
    await disconnected.getByRole("textbox", { name: "Title", exact: true }).fill("Retained");
    await disconnected.getByRole("textbox", { name: "Content", exact: true }).fill("Retained");
    assert.equal(await disconnected.getByRole("button", { name: "Save", exact: true }).isDisabled(), true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("an unread collection is not presented as known empty", async () => {
  const f = await browserFixture();
  try {
    await f.page.route("**/api/read", route => route.abort());
    await f.page.reload();
    await f.page.getByText("Local controller ready", { exact: true }).waitFor();
    assert.equal(await f.page.getByRole("heading", { name: "Nothing here yet." }).count(), 0);
    await f.page.getByRole("heading", { name: "Waiting for your records." }).waitFor();
    assert.equal(await f.page.locator('.collection-heading > span').count(), 0, "unknown count is not displayed as zero");
  } finally { await f.close(); }
});
