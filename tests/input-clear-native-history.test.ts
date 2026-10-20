import test from "node:test";
import assert from "node:assert/strict";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { textClearSource, searchClearSource, updateClear, clearEvents, withoutClearEcho } from "./fixtures/input-clear.ts";

const command = process.platform === "darwin" ? "Meta" : "Control";

for (const primitive of ["input.text", "input.multiline", "search"] as const) {
  for (const echo of [true, false]) {
    for (const activation of ["pointer", "keyboard"] as const) {
      test(`${primitive} native undo/redo preserves clear (${activation}, owner echo ${echo})`, async () => {
        const f = await svelteBrowser(primitive === "search" ? searchClearSource : textClearSource);
        try {
          if (primitive !== "search") await updateClear(f.page, { primitive });
          if (!echo) await withoutClearEcho(f.page);
          const field = f.page.getByRole(primitive === "search" ? "searchbox" : "textbox", {
            name: primitive === "search" ? "Find things" : "Writing", exact: true,
          });
          const clear = f.page.getByRole("button", { name: primitive === "search" ? "Clear search" : "Clear Writing", exact: true });
          await field.pressSequentially("draft");
          if (primitive === "input.multiline") { await field.press("Enter"); await field.pressSequentially("second line"); }
          const draft = primitive === "input.multiline" ? "draft\nsecond line" : "draft";
          assert.equal(await field.inputValue(), draft);
          if (activation === "pointer") await clear.click();
          else {
            await field.press("Tab");
            assert.equal(await clear.evaluate(element => element === document.activeElement), true);
            await f.page.keyboard.press("Enter");
          }
          assert.equal(await field.inputValue(), "");
          assert.equal(await clear.count(), 0);
          assert.equal(await field.evaluate(element => element === document.activeElement), true);
          assert.equal((await clearEvents(f.page)).at(-1), "");
          for (let cycle = 0; cycle < 2; cycle++) {
            await field.press(`${command}+z`);
            assert.equal(await field.inputValue(), draft, "Native undo restores exactly the draft, without duplicating its characters");
            assert.equal(await clear.count(), 1);
            assert.equal((await clearEvents(f.page)).at(-1), draft);
            await field.press(`${command}+Shift+z`);
            assert.equal(await field.inputValue(), "", "Native redo replays the clear, not the prior typing");
            assert.equal(await clear.count(), 0);
            assert.equal((await clearEvents(f.page)).at(-1), "");
          }
          assert.deepEqual(f.errors, []);
        } finally { await f.close(); }
      });
    }
  }
}
