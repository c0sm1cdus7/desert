import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync } from "node:fs";
import { activePanel, browserFixture, panelToolbar, settleMotion, waitForEnabled, waitForNote } from "./fixture.ts";

test("Svelte creates, reads and archives through the real local controller", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Create note", exact: true }).first().click();
    const create = panelToolbar(f.page, "bottom").getByRole("button", { name: "Create note", exact: true });
    assert.equal(await create.count(), 1);
    assert.equal(await create.isDisabled(), true);
    await f.page.getByRole("textbox", { name: "Title", exact: true }).fill("A real local note");
    await f.page.getByRole("textbox", { name: "Content", exact: true }).fill("Written in Svelte. Stored in PostgreSQL.\nNo cloud involved.");
    assert.equal(await create.isEnabled(), true);
    mkdirSync("artifacts", { recursive: true });
    await settleMotion(f.page);
    await f.page.screenshot({ path: "artifacts/notebook-compose.png", fullPage: true });
    await create.click();
    await waitForNote(f.page, "A real local note");
    await f.page.getByText("Written in Svelte. Stored in PostgreSQL.", { exact: false }).last().waitFor();
    assert.equal(await f.page.getByRole("heading", { name: "Review · Create note", exact: true }).count(), 0);
    const context = activePanel(f.page);
    assert.equal(await context.locator('[data-surface-slot="bottom"] button').count(), 0,
      "reading has no command-step or dismissal footer");
    assert.equal(await panelToolbar(f.page, "top").getByRole("button", { name: "Close", exact: true }).count(), 1);
    assert.equal(await f.page.getByRole("region", { name: "Journey", exact: true }).count(), 0);
    assert.equal(await context.getByRole("heading", { name: "Actions", exact: true }).count(), 0,
      "published object commands belong in the shared toolbar, not a second body section");
    await settleMotion(f.page);
    await f.page.screenshot({ path: "artifacts/notebook-context-actions.png", fullPage: true });
    await panelToolbar(f.page, "top").getByRole("button", { name: "Archive note", exact: true }).click();
    await context.locator('[data-toolbar-title]').getByText("Review · Archive note", { exact: true }).waitFor();
    assert.equal((await f.session.read((await f.session.begin("read-note")).id))[0]!.facts.state, "active");
    await panelToolbar(f.page, "bottom")
      .getByRole("button", { name: "Back", exact: true }).click();
    await waitForNote(f.page, "A real local note");
    await panelToolbar(f.page, "top").getByRole("button", { name: "Archive note", exact: true }).click();
    await context.locator('[data-toolbar-title]').getByText("Review · Archive note", { exact: true }).waitFor();
    await panelToolbar(f.page, "bottom").getByRole("button", { name: "Archive note", exact: true }).click();
    await waitForNote(f.page, "A real local note");
    await context.getByText("archived", { exact: true }).waitFor();
    assert.equal(await context.getByRole("button", { name: "Archive note", exact: true }).isDisabled(), true);
    const notes = await f.session.read((await f.session.begin("read-note")).id);
    assert.equal(notes.length, 1);
    assert.equal(notes[0]!.facts.state, "archived");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a real PostgreSQL outage keeps an editable draft and recovers in the same page without submitting it", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Create note", exact: true }).first().click();
    await f.page.getByRole("textbox", { name: "Title", exact: true }).fill("Keep this draft");
    await f.page.getByRole("textbox", { name: "Content", exact: true }).fill("Before the outage.");
    f.cluster.stop();
    const create = panelToolbar(f.page, "bottom").getByRole("button", { name: "Create note", exact: true });
    await waitForEnabled(create, false);
    assert.equal(await f.page.getByRole("textbox", { name: "Title", exact: true }).inputValue(), "Keep this draft");
    await f.page.getByRole("textbox", { name: "Content", exact: true }).fill("Before the outage. Still writing while it is down.");
    mkdirSync("artifacts", { recursive: true });
    await f.page.screenshot({ path: "artifacts/notebook-disconnected.png", fullPage: true });
    f.cluster.start();
    await waitForEnabled(create);
    assert.equal(await f.page.getByRole("textbox", { name: "Content", exact: true }).inputValue(), "Before the outage. Still writing while it is down.");
    assert.equal(await create.isEnabled(), true);
    assert.deepEqual(await f.session.read((await f.session.begin("read-note")).id), []);
    assert.deepEqual(f.errors, []);
  } finally { f.cluster.start(); await f.close(); }
});

test("actual browser transport loss retains input and recovers without a reload", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Create note", exact: true }).first().click();
    await f.page.getByRole("textbox", { name: "Title", exact: true }).fill("No reload");
    await f.page.getByRole("textbox", { name: "Content", exact: true }).fill("Before the connection cut.");
    const create = panelToolbar(f.page, "bottom").getByRole("button", { name: "Create note", exact: true });
    await waitForEnabled(create);
    let navigations = 0;
    f.page.on("framenavigated", frame => { if (frame === f.page.mainFrame()) navigations++; });
    await f.context.setOffline(true);
    await waitForEnabled(create, false);
    await f.page.getByRole("textbox", { name: "Content", exact: true }).fill("Typed with the connection cut.");
    await f.context.setOffline(false);
    await waitForEnabled(create);
    assert.equal(await f.page.getByRole("textbox", { name: "Title", exact: true }).inputValue(), "No reload");
    assert.equal(await f.page.getByRole("textbox", { name: "Content", exact: true }).inputValue(), "Typed with the connection cut.");
    assert.equal(navigations, 0);
    assert.deepEqual(await f.session.read((await f.session.begin("read-note")).id), []);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
