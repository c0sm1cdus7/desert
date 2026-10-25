import test from "node:test";
import assert from "node:assert/strict";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { ResolvedNodeVersion, resolvedNode } from "../src/interaction/resolved-node.ts";

const title = "We couldn’t complete that action";
const description = "This action is no longer available for the current record. No change was accepted.";
const source = (initial: string | null) => `<script lang="ts">
  import FailureDialog from "@desert/svelte/catalog/renderer/failure-dialog/FailureDialog.svelte";
  let code = $state<string | null>(${JSON.stringify(initial)}), calls = $state(0);
</script>
<button onclick={() => code = "PRECONDITION_FAILED"}>Open failure</button>
<output data-dismissals>{calls}</output>
<FailureDialog {code} close={() => { calls++; code = null; }} />`;

async function fixture(initial: string | null) {
  const f = await svelteBrowser(source(initial));
  await f.page.addStyleTag({ content: await rendererCss() });
  await f.page.emulateMedia({ reducedMotion: "reduce" });
  return f;
}

test("an absent failure mounts no message and leaves its host usable without relaxing the bank grammar", async () => {
  assert.throws(() => resolvedNode({ version: ResolvedNodeVersion, kind: "problem", open: false,
    title, description: "", locked: false, severity: "error" }), /INVALID_BANK_NODE/);
  const f = await fixture(null);
  try {
    assert.deepEqual(f.errors, [], "no error must not manufacture an invalid problem node");
    assert.equal(await f.page.getByRole("dialog").count(), 0);
    assert.equal(await f.page.locator('[data-modal="message"], [data-piece="face"]').count(), 0);
    assert.equal(await f.page.getByRole("button", { name: "Open failure", exact: true }).isVisible(), true);
    assert.equal(await f.page.locator('[data-dismissals]').innerText(), "0");
  } finally { await f.close(); }
});

test("a real failure uses one shared message face and can return to the absent state safely", async () => {
  const f = await fixture("PRECONDITION_FAILED");
  try {
    const dialog = f.page.getByRole("dialog", { name: title, exact: true });
    await dialog.waitFor();
    assert.equal(await f.page.getByRole("dialog").count(), 1);
    // The dialog shows one status face over its title; its visible sentence is the dialog's description.
    assert.equal(await dialog.locator('[data-piece="face"]').count(), 1);
    assert.equal(await dialog.locator('[data-piece="face"]').getAttribute("data-tone"), "error");
    assert.equal(await dialog.evaluate(node => document.getElementById(node.getAttribute("aria-describedby")!)?.textContent), description);
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    assert.deepEqual(f.errors, [], "clearing a genuine error must not create an invalid closed node");
    assert.equal(await f.page.locator('[data-dismissals]').innerText(), "1");
    assert.equal(await f.page.locator('[data-piece="face"]').count(), 0);
  } finally { await f.close(); }
});

test("failure dismissal restores its opener and reopening never duplicates dialogs or callbacks", async () => {
  const f = await fixture(null);
  try {
    assert.deepEqual(f.errors, []);
    const opener = f.page.getByRole("button", { name: "Open failure", exact: true });
    for (const [index, route] of ["close", "keyboard", "escape", "close"].entries()) {
      await opener.click();
      const dialog = f.page.getByRole("dialog", { name: title, exact: true });
      await dialog.waitFor();
      assert.equal(await f.page.getByRole("dialog").count(), 1);
      assert.equal(await f.page.locator('[data-piece="face"]').count(), 1);
      assert.equal(await dialog.getByRole("button", { name: "Close", exact: true }).count(), 1);
      if (route === "escape") await f.page.keyboard.press("Escape");
      else if (route === "keyboard") {
        await dialog.getByRole("button", { name: "Close", exact: true }).focus();
        await f.page.keyboard.press("Enter");
      }
      else await dialog.getByRole("button", { name: "Close", exact: true }).click();
      await dialog.waitFor({ state: "hidden" });
      await f.page.waitForFunction(() => document.activeElement?.textContent === "Open failure");
      assert.equal(await f.page.locator('[data-dismissals]').innerText(), String(index + 1));
      assert.equal(await f.page.locator('[data-modal="message"], [data-piece="face"]').count(), 0);
      assert.deepEqual(f.errors, []);
    }
  } finally { await f.close(); }
});
