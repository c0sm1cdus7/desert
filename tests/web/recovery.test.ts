import assert from "node:assert/strict";
import test from "node:test";
import { mkdirSync } from "node:fs";
import { browserFixture, panelToolbar, waitForEnabled, waitForNote } from "./fixture.ts";

test("a lost acceptance response is recovered from its real receipt, without another submission", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Create note", exact: true }).first().click();
    await f.page.getByRole("textbox", { name: "Title", exact: true }).fill("Only once");
    await f.page.getByRole("textbox", { name: "Content", exact: true }).fill("The reply is lost, not the note.");
    let submissions = 0;
    await f.page.route("**/api/accept", async route => {
      submissions++;
      const response = await route.fetch();
      assert.equal(response.status(), 200);
      await route.abort("failed");
    });
    await f.page.getByRole("button", { name: "Create note", exact: true }).last().click();
    const failure = f.page.getByRole("dialog", { name: "The result isn’t confirmed", exact: true });
    await failure.waitFor();
    for (let index = 0; index < 4; index++) {
      await f.page.keyboard.press("Tab");
      assert.equal(await failure.evaluate(node => node.contains(document.activeElement)), true);
    }
    await failure.locator('[data-surface-slot="bottom"]').getByRole("button", { name: "Close", exact: true }).click();
    await failure.waitFor({ state: "hidden" });
    await f.page.getByRole("button", { name: "Check result", exact: true }).click();
    await waitForNote(f.page, "Only once");
    await f.page.getByText("The reply is lost, not the note.", { exact: true }).waitFor();
    assert.equal(submissions, 1);
    const notes = await f.session.read((await f.session.begin("read-note")).id);
    assert.equal(notes.length, 1);
    assert.equal(notes[0]!.facts.title, "Only once");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("revocation blocks the existing browser without erasing its mobile draft", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.setViewportSize({ width: 390, height: 844 });
    await f.page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await f.page.getByRole("button", { name: "Create note", exact: true }).first().click();
    await f.page.getByRole("textbox", { name: "Title", exact: true }).fill("Keep me private");
    await f.page.getByRole("textbox", { name: "Content", exact: true }).fill("An expired identity must not silently become another one.");
    await f.host.identities.revoke(f.identity.id);
    await waitForEnabled(panelToolbar(f.page, "bottom").getByRole("button", { name: "Create note", exact: true }), false);
    assert.equal(await f.page.getByRole("textbox", { name: "Title", exact: true }).inputValue(), "Keep me private");
    assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await f.page.getByRole("textbox", { name: "Title", exact: true }).getAttribute("aria-required"), "true");
    mkdirSync("artifacts", { recursive: true });
    await f.page.screenshot({ path: "artifacts/notebook-mobile-dark.png", fullPage: true });
    await assert.rejects(f.session.begin("create-note"), /UNAUTHENTICATED/);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
