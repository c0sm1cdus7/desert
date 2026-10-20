import test from "node:test";
import assert from "node:assert/strict";
import { browserFixture } from "./fixture.ts";

test("product fields explain touched invalid input accessibly and keep writing during an outage", async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Create note", exact: true }).click();
    const form = f.page.getByRole("dialog", { name: "Create note", exact: true });
    const title = form.getByRole("textbox", { name: "Title", exact: true });
    const body = form.getByRole("textbox", { name: "Content", exact: true });
    const save = form.getByRole("button", { name: "Create note", exact: true });
    assert.equal(await form.locator('[data-slot="field-error"]').count(), 0);
    assert.equal(await save.isDisabled(), true);
    await title.focus(); await body.focus();
    await form.getByText("Enter a value.", { exact: true }).waitFor();
    assert.equal(await title.getAttribute("aria-invalid"), "true");
    assert.equal(await title.evaluate(element => {
      const id = element.getAttribute("aria-describedby");
      return id && document.getElementById(id)?.textContent;
    }), "Enter a value.");
    assert.equal(await body.getAttribute("aria-invalid"), "false", "untouched sibling remains quiet");
    await title.fill("💡"); await body.fill("Retained writing");
    assert.equal(await save.isEnabled(), true);
    assert.equal(await form.locator('[data-slot="field-error"]').count(), 0);
    assert.equal(await title.getAttribute("aria-describedby"), null);
    await f.page.route("**/api/availability", route => route.abort());
    await f.page.waitForFunction(() => {
      const button = document.querySelector('form button[type="submit"]');
      return button instanceof HTMLButtonElement && button.disabled;
    });
    assert.equal(await body.inputValue(), "Retained writing");
    assert.equal(await body.isEditable(), true);
    await body.fill("");
    assert.equal(await body.getAttribute("aria-invalid"), "true");
    await body.fill("Kept through reconnect");
    await f.page.unroute("**/api/availability");
    await f.page.waitForFunction(() => {
      const button = document.querySelector('form button[type="submit"]');
      return button instanceof HTMLButtonElement && !button.disabled;
    });
    assert.equal(await body.inputValue(), "Kept through reconnect");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
