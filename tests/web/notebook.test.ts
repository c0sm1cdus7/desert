import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync } from "node:fs";
import { browserFixture, settleMotion } from "./fixture.ts";

test("Svelte creates, reads and archives through the real local controller", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Create note", exact: true }).first().click();
    const create = f.page.locator("form").getByRole("button", { name: "Create note", exact: true });
    assert.equal(await create.count(), 1);
    assert.equal(await create.isDisabled(), true);
    await f.page.getByRole("textbox", { name: "Title", exact: true }).fill("A real local note");
    await f.page.getByRole("textbox", { name: "Content", exact: true }).fill("Written in Svelte. Stored in PostgreSQL.\nNo cloud involved.");
    assert.equal(await create.isEnabled(), true);
    mkdirSync("artifacts", { recursive: true });
    await settleMotion(f.page);
    await f.page.screenshot({ path: "artifacts/notebook-compose.png", fullPage: true });
    await create.click();
    await f.page.getByRole("heading", { name: "Read notes", exact: true }).last().waitFor();
    await f.page.getByText("Written in Svelte. Stored in PostgreSQL.", { exact: false }).last().waitFor();
    assert.equal(await f.page.getByRole("heading", { name: "Review · Create note", exact: true }).count(), 0);
    const context = f.page.getByRole("region", { name: "Object context", exact: true });
    await f.page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(await context.locator("footer").count(), 0,
      "reading has no command-step or dismissal footer");
    assert.equal(await context.locator('[data-surface-slot="top"]').getByRole("button", { name: "Back", exact: true }).count(), 1);
    assert.equal(await f.page.getByRole("region", { name: "Journey", exact: true }).count(), 0);
    await context.getByRole("heading", { name: "Actions", exact: true }).waitFor();
    await settleMotion(f.page);
    await f.page.screenshot({ path: "artifacts/notebook-context-actions.png", fullPage: true });
    await context.getByRole("region", { name: "Actions", exact: true }).getByRole("button", { name: "Archive note", exact: true }).click();
    await f.page.getByRole("heading", { name: "Review · Archive note", exact: true }).waitFor();
    assert.equal((await f.session.read((await f.session.begin("read-note")).id))[0]!.facts.state, "active");
    await f.page.getByRole("region", { name: "Journey", exact: true }).locator('[data-surface-slot="bottom"]')
      .getByRole("button", { name: "Back", exact: true }).click();
    await context.getByRole("region", { name: "Actions", exact: true }).getByRole("button", { name: "Archive note", exact: true }).click();
    await f.page.getByRole("heading", { name: "Review · Archive note", exact: true }).waitFor();
    await f.page.getByRole("region", { name: "Journey", exact: true }).getByRole("button", { name: "Archive note", exact: true }).click();
    await context.getByText("archived", { exact: true }).waitFor();
    await f.page.getByRole("heading", { name: "Read notes", exact: true }).last().waitFor();
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
    await f.page.getByRole("region", { name: "Journey", exact: true }).getByText("Local controller unavailable · draft kept", { exact: true }).waitFor();
    assert.equal(await f.page.locator("form").getByRole("button", { name: "Create note", exact: true }).isDisabled(), true);
    assert.equal(await f.page.getByRole("textbox", { name: "Title", exact: true }).inputValue(), "Keep this draft");
    await f.page.getByRole("textbox", { name: "Content", exact: true }).fill("Before the outage. Still writing while it is down.");
    mkdirSync("artifacts", { recursive: true });
    await f.page.screenshot({ path: "artifacts/notebook-disconnected.png", fullPage: true });
    f.cluster.start();
    await f.page.getByRole("region", { name: "Journey", exact: true }).getByText("Local controller ready", { exact: true }).waitFor();
    assert.equal(await f.page.getByRole("textbox", { name: "Content", exact: true }).inputValue(), "Before the outage. Still writing while it is down.");
    assert.equal(await f.page.locator("form").getByRole("button", { name: "Create note", exact: true }).isEnabled(), true);
    assert.deepEqual(await f.session.read((await f.session.begin("read-note")).id), []);
    assert.deepEqual(f.errors, []);
  } finally { f.cluster.start(); await f.close(); }
});

test("actual browser transport loss retains input and recovers without a reload", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Create note", exact: true }).first().click();
    await f.page.getByRole("textbox", { name: "Title", exact: true }).fill("No reload");
    let navigations = 0;
    f.page.on("framenavigated", frame => { if (frame === f.page.mainFrame()) navigations++; });
    await f.context.setOffline(true);
    await f.page.getByRole("region", { name: "Journey", exact: true }).getByText("Local controller unavailable · draft kept", { exact: true }).waitFor();
    await f.page.getByRole("textbox", { name: "Content", exact: true }).fill("Typed with the connection cut.");
    await f.context.setOffline(false);
    await f.page.getByRole("region", { name: "Journey", exact: true }).getByText("Local controller ready", { exact: true }).waitFor();
    assert.equal(await f.page.getByRole("textbox", { name: "Title", exact: true }).inputValue(), "No reload");
    assert.equal(await f.page.getByRole("textbox", { name: "Content", exact: true }).inputValue(), "Typed with the connection cut.");
    assert.equal(navigations, 0);
    assert.deepEqual(await f.session.read((await f.session.begin("read-note")).id), []);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
