import test from "node:test";
import assert from "node:assert/strict";
import { browserFixture } from "./fixture.ts";

test("typed select changes, clears explicitly and retains disabled control state", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click();
    const bench = f.page.locator("[data-control-bench]");
    const padding = await bench.locator('[data-slot="card-content"]').evaluateAll(elements =>
      elements.map(element => Number.parseFloat(getComputedStyle(element).paddingLeft)));
    assert.ok(padding.length > 0 && padding.every(value => value >= 16), "bench content uses the shared 16px spacing token");
    const select = bench.getByRole("button", { name: "Single choice", exact: true });
    const field = bench.locator('[data-control="select"]').filter({ has: f.page.getByRole("button", { name: "Single choice", exact: true }) });
    const clear = field.getByRole("button", { name: "Clear selection", exact: true });
    assert.equal(await clear.isDisabled(), true);
    await select.click();
    assert.equal(await f.page.getByRole("radio", { name: "Unavailable option" }).isDisabled(), true);
    await f.page.getByRole("dialog", { name: "Single choice", exact: true }).getByRole("radio", { name: "First option", exact: true }).focus();
    await f.page.keyboard.press("End");
    assert.equal((await select.textContent())?.trim(), "Not selected", "navigation stages rather than commits a choice");
    await f.page.getByRole("dialog", { name: "Single choice", exact: true }).getByRole("button", { name: "Confirm", exact: true }).click();
    assert.equal((await select.textContent())?.trim(), "Second option", "keyboard skips the disabled final option");
    await select.click();
    await f.page.getByRole("dialog", { name: "Single choice", exact: true }).getByRole("radio", { name: "First option", exact: true }).click();
    await f.page.getByRole("dialog", { name: "Single choice", exact: true }).getByRole("button", { name: "Confirm", exact: true }).click();
    assert.equal((await select.textContent())?.trim(), "First option");
    assert.equal(await clear.getAttribute("data-primitive"), "action");
    await clear.click();
    assert.equal((await select.textContent())?.trim(), "Not selected");
    assert.equal(await clear.isDisabled(), true);
    const disabled = bench.getByRole("button", { name: "Disabled choice", exact: true });
    assert.equal(await disabled.isDisabled(), true);
    assert.equal((await disabled.textContent())?.trim(), "Retained selection");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("typed popover uses canonical actions, keyboard Escape and trigger focus restoration", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click();
    const trigger = f.page.getByRole("button", { name: "Open contextual information", exact: true });
    assert.equal(await trigger.getAttribute("data-primitive"), "action");
    await trigger.focus();
    await f.page.keyboard.press("Enter");
    const popover = f.page.getByRole("dialog", { name: "Local interaction", exact: true });
    await popover.waitFor({ state: "visible" });
    assert.equal(await trigger.getAttribute("aria-expanded"), "true");
    const close = popover.locator('[data-surface-slot="bottom"]').getByRole("button", { name: "Close", exact: true });
    assert.equal(await close.getAttribute("data-primitive"), "action");
    await f.page.keyboard.press("Escape");
    await popover.waitFor({ state: "hidden" });
    assert.equal(await trigger.evaluate(element => element === document.activeElement), true);
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");
    await trigger.click();
    await close.click();
    await popover.waitFor({ state: "hidden" });
    assert.equal(await trigger.evaluate(element => element === document.activeElement), true);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("local file selection rejects limits and removes handles without uploading", { timeout: 30000 }, async () => {
  const f = await browserFixture();
  try {
    await f.page.getByRole("button", { name: "Renderer catalog", exact: true }).click();
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
