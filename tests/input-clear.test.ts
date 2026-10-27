import test from "node:test";
import assert from "node:assert/strict";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { textClearSource, selectionClearSource, updateClear, clearEvents, withoutClearEcho } from "./fixtures/input-clear.ts";

for (const primitive of ["input.text", "input.multiline"] as const) {
  test(`${primitive} clear tracks visible writing, including whitespace and unacknowledged drafts`, async () => {
    const f = await svelteBrowser(textClearSource);
    try {
      await updateClear(f.page, { primitive });
      const field = f.page.getByRole("textbox", { name: "Writing", exact: true });
      const clear = f.page.getByRole("button", { name: "Clear Writing", exact: true });
      assert.equal(await clear.count(), 0, "Empty editors do not show an inactive accessory");
      await withoutClearEcho(f.page);
      for (const draft of ["local draft", "   "]) {
        await field.fill(draft);
        assert.equal(await clear.count(), 1, "The actual editor value, not the acknowledged owner value, determines visibility");
        assert.equal(await clear.getAttribute("type"), "button");
        await clear.click();
        assert.equal(await field.inputValue(), "");
        assert.equal(await clear.count(), 0);
        assert.equal(await field.evaluate(element => element === document.activeElement), true);
        assert.equal((await clearEvents(f.page)).at(-1), "");
        if (primitive === "input.multiline") assert.equal(await f.page.locator("[data-character-counter]").innerText(), "0 characters");
      }
      assert.equal(await f.page.locator("[data-submissions]").innerText(), "0");
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  });

  test(`${primitive} clear is keyboard accessible, restores editing focus, and honors disabled state`, async () => {
    const f = await svelteBrowser(textClearSource);
    try {
      await updateClear(f.page, { primitive, value: "Owner value", disabled: true });
      const field = f.page.getByRole("textbox", { name: "Writing", exact: true });
      const clear = f.page.getByRole("button", { name: "Clear Writing", exact: true });
      // Second review of the slice 3 package: a disabled field offers no clear, single line and multiline alike (the
      // multiline field still showed its ⊗); its value stays untouched.
      assert.equal(await clear.count(), 0, "A disabled editor shows no clear accessory");
      assert.equal(await field.inputValue(), "Owner value");
      assert.deepEqual(await clearEvents(f.page), []);
      await updateClear(f.page, { disabled: false });
      assert.equal(await clear.count(), 1, "Enabled again, the nonempty editor offers its clear");
      await field.focus(); await field.press("Tab");
      assert.equal(await clear.evaluate(element => element === document.activeElement), true);
      await f.page.keyboard.press("Enter");
      assert.equal(await field.inputValue(), "");
      assert.equal(await field.evaluate(element => element === document.activeElement), true);
      assert.equal(await clear.count(), 0);
      assert.equal((await clearEvents(f.page)).filter((value: string) => value === "").length, 1);
      assert.equal(await f.page.locator("[data-submissions]").innerText(), "0");
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  });
}

test("selection triggers and calendars never gain text-editing clear accessories", async () => {
  const f = await svelteBrowser(selectionClearSource);
  try {
    assert.equal(await f.page.locator("[data-select]").getByRole("button", { name: /clear/i }).count(), 0);
    assert.equal(await f.page.locator("[data-calendar]").getByRole("button", { name: /clear/i }).count(), 0);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

for (const primitive of ["input.text", "input.multiline"] as const) {
  test(`${primitive} required fields remain clearable and accept subsequent owner replacement`, async () => {
    const f = await svelteBrowser(textClearSource);
    try {
      await updateClear(f.page, { primitive, required: true, value: "First" });
      const field = f.page.getByRole("textbox", { name: "Writing", exact: true });
      const clear = f.page.getByRole("button", { name: "Clear Writing", exact: true });
      await clear.click();
      assert.equal(await field.inputValue(), "");
      assert.equal(await field.getAttribute("aria-required"), "true");
      assert.equal(await clear.count(), 0);
      await updateClear(f.page, { value: "Owner replacement" });
      assert.equal(await field.inputValue(), "Owner replacement");
      assert.equal(await clear.count(), 1);
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  });
}
