import test from "node:test";
import assert from "node:assert/strict";
import { inspectionFixture as browserFixture, openCatalog } from "./inspection-fixture.ts";

test("typed select changes, clears explicitly and retains disabled control state", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await openCatalog(f.page);
    const bench = f.page.locator("[data-control-bench]");
    const field = bench.locator('[data-specimen="control.select:available"]');
    const select = field.locator('[data-selection-trigger]');
    const padding = await select.evaluate(element => element.querySelector('[data-slot="field-label"]')!.getBoundingClientRect().left - element.getBoundingClientRect().left);
    assert.ok(padding >= 16, "the whole-well trigger retains the shared inner spacing");
    const clear = field.getByRole("button", { name: "Clear selection", exact: true });
    assert.equal(await clear.isDisabled(), true);
    await select.click();
    const menu = f.page.getByRole("listbox");
    assert.equal(await menu.getByRole("option", { name: "Unavailable option" }).getAttribute("aria-disabled"), "true");
    await menu.getByRole("option", { name: "First option", exact: true }).focus();
    await f.page.keyboard.press("End");
    assert.equal(await select.locator('[data-field-value]').innerText(), "Not selected", "keyboard focus alone never commits");
    await f.page.keyboard.press("Enter");
    await menu.waitFor({ state: "hidden" });
    assert.equal(await select.locator('[data-field-value]').innerText(), "Second option", "keyboard skips the disabled final option");
    await select.click();
    await menu.getByRole("option", { name: "First option", exact: true }).click();
    await menu.waitFor({ state: "hidden" });
    assert.equal(await select.locator('[data-field-value]').innerText(), "First option");
    assert.equal(await clear.getAttribute("data-primitive"), "action");
    await clear.click();
    assert.equal(await select.locator('[data-field-value]').innerText(), "Not selected");
    assert.equal(await clear.isDisabled(), true);
    const disabled = bench.locator('[data-specimen="control.select:disabled"] [data-selection-trigger]');
    assert.equal(await disabled.isDisabled(), true);
    assert.equal(await disabled.locator('[data-field-value]').innerText(), "Retained selection");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("typed popover uses canonical actions, keyboard Escape and trigger focus restoration", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await openCatalog(f.page);
    const trigger = f.page.getByRole("button", { name: "Open contextual information", exact: true });
    assert.equal(await trigger.getAttribute("data-primitive"), "action");
    await trigger.focus();
    await f.page.keyboard.press("Enter");
    const popover = f.page.getByRole("dialog", { name: "Local interaction", exact: true });
    await popover.waitFor({ state: "visible" });
    assert.equal(await trigger.getAttribute("aria-expanded"), "true");
    assert.equal(await popover.getAttribute("aria-modal"), "false");
    assert.equal(await popover.getByRole("toolbar").count(), 0, "contextual information is not a modal task");
    await f.page.keyboard.press("Escape");
    await popover.waitFor({ state: "hidden" });
    assert.equal(await trigger.evaluate(element => element === document.activeElement), true);
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");
    await trigger.click();
    await f.page.keyboard.press("Tab");
    await popover.waitFor({ state: "hidden" });
    assert.equal(await popover.count(), 0, "Tab continues ordinary document navigation instead of trapping focus");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("local file selection rejects limits and removes handles without uploading", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await openCatalog(f.page);
    const writes: string[] = [];
    f.page.on("request", request => { if (request.method() !== "GET") writes.push(request.url()); });
    const bench = f.page.locator("[data-control-bench]");
    const input = bench.getByLabel("Choose local text files", { exact: true });
    await input.setInputFiles([
      { name: "accepted.txt", mimeType: "text/plain", buffer: Buffer.from("hello") },
      { name: "large.txt", mimeType: "text/plain", buffer: Buffer.alloc(10241) },
      { name: "wrong.png", mimeType: "image/png", buffer: Buffer.from("not an image") },
    ]);
    const list = bench.getByRole("list", { name: "Selected local files" });
    assert.match(await list.textContent() ?? "", /accepted\.txt/);
    assert.equal(await list.getByRole("listitem").count(), 1);
    assert.equal(await bench.getByText("large.txt: File is too large.", { exact: true }).isVisible(), true);
    assert.equal(await bench.getByText("wrong.png: File type is not accepted.", { exact: true }).isVisible(), true);
    const remove = list.getByRole("button", { name: "Remove accepted.txt", exact: true });
    assert.equal(await remove.getAttribute("data-primitive"), "action");
    await remove.click();
    assert.equal(await bench.getByText("No local files selected.", { exact: true }).isVisible(), true);
    await input.setInputFiles({ name: "accepted.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
    assert.equal(await list.getByRole("listitem").count(), 1, "same file can be selected again after removal");
    assert.deepEqual(writes, [], "choosing files must not send network writes");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
