import assert from "node:assert/strict";
import test from "node:test";
import { activePanel, browserFixture, panelToolbar, waitForEnabled, waitForNote } from "./fixture.ts";

test("a draft edited during preparation is not accepted by the earlier click", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  let release = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  let arrived = () => {};
  const pending = new Promise<void>(resolve => { arrived = resolve; });
  try {
    await f.page.getByRole("button", { name: "Create note", exact: true }).first().click();
    await f.page.getByRole("textbox", { name: "Title", exact: true }).fill("Initial draft");
    await f.page.getByRole("textbox", { name: "Content", exact: true }).fill("Initial content");
    await f.page.route("**/api/prepare", async route => {
      const response = await route.fetch();
      arrived();
      await gate;
      await route.fulfill({ response });
    });
    let acceptances = 0;
    f.page.on("request", request => { if (request.url().endsWith("/api/accept")) acceptances++; });
    const submit = panelToolbar(f.page, "bottom").getByRole("button", { name: "Create note", exact: true });
    await submit.click();
    await pending;
    await f.page.getByRole("textbox", { name: "Content", exact: true }).fill("Newer content");
    release();
    await waitForEnabled(submit);
    assert.equal(await submit.isEnabled(), true);
    assert.equal(acceptances, 0);
    assert.deepEqual(await f.session.read((await f.session.begin("read-note")).id), []);
    await submit.click();
    await waitForNote(f.page, "Initial draft");
    assert.equal(acceptances, 1);
    const notes = await f.session.read((await f.session.begin("read-note")).id);
    assert.equal(notes.length, 1);
    const [detail] = await f.session.read((await f.session.begin("read-note", notes[0]!.id)).id);
    assert.equal(detail!.facts.body, "Newer content");
    assert.deepEqual(f.errors, []);
  } finally { release(); await f.close(); }
});

test("an explicit retry after a lost direct-submit reply accepts only the original intent", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Create note", exact: true }).first().click();
    await f.page.getByRole("textbox", { name: "Title", exact: true }).fill("Do not duplicate");
    await f.page.getByRole("textbox", { name: "Content", exact: true }).fill("One durable operation");
    const attempts: unknown[] = [];
    await f.page.route("**/api/accept", async route => {
      attempts.push(route.request().postDataJSON());
      const response = await route.fetch();
      if (attempts.length === 1) await route.abort("failed");
      else await route.fulfill({ response });
    });
    await panelToolbar(f.page, "bottom").getByRole("button", { name: "Create note", exact: true }).click();
    const failure = f.page.getByRole("dialog", { name: "The result isn’t confirmed", exact: true });
    await failure.waitFor();
    await failure.locator('[data-surface-slot="bottom"]').getByRole("button", { name: "Close", exact: true }).click();
    await failure.waitFor({ state: "hidden" });
    for (const slot of ["top", "bottom"]) {
      assert.equal(await activePanel(f.page).locator(`[data-surface-slot="${slot}"]`).getByRole("button", { name: "Close", exact: true }).isDisabled(), true);
    }
    await f.page.getByRole("button", { name: "Retry same confirmation", exact: true }).click();
    await waitForNote(f.page, "Do not duplicate");
    assert.equal(attempts.length, 2);
    assert.deepEqual(attempts[1], attempts[0]);
    assert.equal((await f.session.read((await f.session.begin("read-note")).id)).length, 1);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("typing after acceptance starts never changes its effect or erases the newer draft", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  let release = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  let arrived = () => {};
  const committed = new Promise<void>(resolve => { arrived = resolve; });
  try {
    await f.page.getByRole("button", { name: "Create note", exact: true }).first().click();
    await f.page.getByRole("textbox", { name: "Title", exact: true }).fill("Submitted title");
    await f.page.getByRole("textbox", { name: "Content", exact: true }).fill("Submitted content");
    await f.page.route("**/api/accept", async route => {
      const response = await route.fetch();
      arrived();
      await gate;
      await route.fulfill({ response });
    });
    await panelToolbar(f.page, "bottom").getByRole("button", { name: "Create note", exact: true }).click();
    await committed;
    await f.page.getByRole("textbox", { name: "Content", exact: true }).fill("Keep this newer draft");
    release();
    await waitForNote(f.page, "Submitted title");
    const notes = await f.session.read((await f.session.begin("read-note")).id);
    assert.equal(notes.length, 1);
    const [detail] = await f.session.read((await f.session.begin("read-note", notes[0]!.id)).id);
    assert.equal(detail!.facts.body, "Submitted content");
    await panelToolbar(f.page, "top").getByRole("button", { name: "Close", exact: true }).click();
    await activePanel(f.page).waitFor({ state: "hidden" });
    await f.page.getByRole("button", { name: "Create note", exact: true }).click();
    assert.equal(await f.page.getByRole("textbox", { name: "Content", exact: true }).inputValue(), "Keep this newer draft");
    assert.deepEqual(f.errors, []);
  } finally { release(); await f.close(); }
});
