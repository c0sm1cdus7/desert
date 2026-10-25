// The access form's bottom is the one bottom pair of an action (law 9c; fourth review of the slice 3 package): the
// two-step identity form showed a lone «Continue». Now Bar's steps pair closes it: text only, each half of the row; on step 1
// «Cancel» on the left (it discards what was typed) and «Continue» on the right (unavailable until the step holds what it
// declares); on step 2 «Back» on the left (what was typed is kept) and the verb, «Get started», on the right.
import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const source = `<script lang="ts">
  import AccessForm from "@desert/svelte/catalog/compositions/access-form/AccessForm.svelte";
  let submitted = $state(0);
</script>
<main style="padding:16px;max-width:640px"><AccessForm mode="initialize" productLabel="VOID" preferences={{ theme: "light", tint: "blue", wallpaper: "mist", textSize: "standard" }}
  onappearancechange={() => {}} onsubmit={async () => { submitted++; }} /><output>{submitted}</output></main>`;

/** The form's bottom: its bar's purpose, its commands left to right (label, width, glyphs shown) and the row's width. */
function bottom() {
  const form = document.querySelector("form")!, bar = form.querySelector('[data-piece="toolbar"]');
  const submits = [...form.querySelectorAll('button[type="submit"]')].filter(button => !bar?.contains(button)).length;
  if (!bar) return { purpose: null, commands: [], row: 0, submits };
  const row = bar.querySelector("[data-bar-row]")!;
  const commands = [...row.querySelectorAll("button")].map(button => { const box = button.getBoundingClientRect();
    return { label: button.textContent!.trim(), left: Math.round(box.left), width: Math.round(box.width), type: button.type,
      disabled: button.disabled || button.getAttribute("aria-disabled") === "true",
      glyphs: [...button.querySelectorAll("svg")].filter(svg => svg.checkVisibility({ visibilityProperty: true, opacityProperty: true })).length }; });
  return { purpose: bar.getAttribute("data-toolbar-purpose"), edge: bar.getAttribute("data-toolbar"), commands, row: Math.round(row.getBoundingClientRect().width), submits };
}

test("the access form closes each step with the one bottom pair: Cancel or Back, and Continue or the verb", { timeout: 90000 }, async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.setViewportSize({ width: 390, height: 1400 });
    await f.page.emulateMedia({ reducedMotion: "reduce" });
    await f.page.addStyleTag({ content: await rendererCss() });
    const pair = async (left: string, right: string, step: string) => {
      const found = await f.page.evaluate(bottom), seen = JSON.stringify(found);
      assert.equal(found.purpose, "steps", `${step}: the bottom is Bar's steps pair: ${seen}`);
      assert.equal(found.edge, "bottom", `${step}: a bottom bar: ${seen}`);
      assert.deepEqual(found.commands.map(command => command.label), [left, right], `${step}: ${left} on the left, ${right} on the right: ${seen}`);
      assert.equal(found.submits, 0, `${step}: no other submit beside the pair: ${seen}`);
      const [a, b] = found.commands;
      assert.ok(a!.left < b!.left && Math.abs(a!.width - b!.width) <= 1 && a!.width * 2 >= found.row - 16, `${step}: each half of the row: ${seen}`);
      assert.equal(a!.glyphs + b!.glyphs, 0, `${step}: text only, no glyphs: ${seen}`);
      assert.equal(b!.type, "submit", `${step}: the right one submits the form: ${seen}`);
      return found;
    };
    const first = await pair("Cancel", "Continue", "step 1");
    assert.equal(first.commands[1]!.disabled, true, "step 1: Continue waits for the step to hold what it declares");
    const fill = async () => {
      await f.page.getByLabel("Display name", { exact: true }).fill("Ada");
      await f.page.getByLabel("Identity name", { exact: true }).fill("ada.lovelace");
      await f.page.getByLabel("Password", { exact: true }).fill("correct horse battery");
    };
    await fill();
    assert.equal((await f.page.evaluate(bottom)).commands[1]!.disabled, false, "step 1: a complete step can continue");
    await f.page.getByRole("button", { name: "Cancel", exact: true }).click();
    assert.deepEqual(await Promise.all(["Display name", "Identity name", "Password"].map(label => f.page.getByLabel(label, { exact: true }).inputValue())), ["", "", ""],
      "Cancel discards what was typed");
    await fill();
    await f.page.getByRole("button", { name: "Continue", exact: true }).click();
    await f.page.getByRole("button", { name: "Back", exact: true }).waitFor();
    await pair("Back", "Get started", "step 2");
    await f.page.getByRole("button", { name: "Back", exact: true }).click();
    await f.page.getByRole("button", { name: "Cancel", exact: true }).waitFor();
    assert.equal(await f.page.getByLabel("Identity name", { exact: true }).inputValue(), "ada.lovelace", "Back keeps what was typed");
    await f.page.getByRole("button", { name: "Continue", exact: true }).click();
    await f.page.getByRole("button", { name: "Get started", exact: true }).click();
    await f.page.locator("output", { hasText: "1" }).waitFor();
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
