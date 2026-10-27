// The required mark has one owner (slice 3 close-out): the theme's typography draws it (the `required-mark` utility) and
// every label that marks a requirement applies it from its piece's typed `required` prop. No piece writes the mark as a
// literal or a message of its own; it stays decorative, so a label's accessible name never includes it.
import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

async function files(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(join(folder, entry.name)) : [join(folder, entry.name)]))).flat();
}

test("no piece draws its own required mark: one utility of the theme's typography draws it", async () => {
  for (const path of (await files("src/svelte")).filter(path => path.endsWith(".svelte"))) {
    const source = await readFile(path, "utf8");
    assert.doesNotMatch(source, /requiredMark|class="required[\s"]|>\*</, `${path} draws a required mark of its own`);
  }
  const messages = await readFile("src/messages/en.json", "utf8");
  assert.doesNotMatch(messages, /"requiredMark"/, "no piece owns a required-mark message");
  const typography = await readFile("src/svelte/catalog/mechanisms/typography/typography.css", "utf8");
  assert.equal(typography.match(/@utility required-mark\b/g)?.length, 1);
});

const page = `<script lang="ts">
  import Field from "@desert/svelte/catalog/foundations/field/Field.svelte";
  import Choice from "@desert/svelte/catalog/foundations/choice/Choice.svelte";
  import Heading from "@desert/svelte/catalog/foundations/heading/Heading.svelte";
  const options = [{ value: "weekly", label: "Weekly", disabled: false }, { value: "monthly", label: "Monthly", disabled: false }];
</script>
<main style="max-width:600px;padding:16px">
  <section data-case="field"><Field primitive="input.text" label="Title" labelVisibility="visible" measure="writing" purpose="text" value=""
    required invalid={false} disabled={false} clear onchange={() => {}} /></section>
  <section data-case="optional"><Field primitive="input.text" label="Note" labelVisibility="visible" measure="writing" purpose="text" value=""
    required={false} invalid={false} disabled={false} clear onchange={() => {}} /></section>
  <section data-case="rows"><Choice presentation="rows" cardinality="one" label="Summary" labelVisibility="visible" selected={["weekly"]}
    disabled={false} required {options} onchange={() => {}} /></section>
  <section data-case="menu"><Choice presentation="menu" cardinality="one" menuTrigger="well" label="Cadence" labelVisibility="visible"
    selected={["weekly"]} disabled={false} required placeholder="Choose" {options} onchange={() => {}} /></section>
  <section data-case="heading"><Heading kind="group" text="Display name" required /></section>
</main>`;

test("every required label shows the theme's one mark in destructive ink, outside its accessible name", { timeout: 60000 }, async () => {
  const f = await svelteBrowser(page);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    const ink = await f.page.evaluate(() => {
      const probe = document.createElement("span"); probe.style.color = "var(--destructive)"; document.body.append(probe);
      const color = getComputedStyle(probe).color; probe.remove(); return color;
    });
    const mark = (selector: string) => f.page.locator(selector).evaluate(node => {
      const after = getComputedStyle(node, "::after");
      return { content: after.content, color: after.color };
    });
    for (const selector of ['[data-case="field"] [data-slot="field-label"]', '[data-case="rows"] legend',
      '[data-case="menu"] [data-slot="field-label"]', '[data-case="heading"] h2']) {
      const drawn = await mark(selector);
      assert.match(drawn.content, /^"\*"/, `${selector} shows the mark`);
      assert.equal(drawn.color, ink, `${selector} inks it destructive`);
    }
    assert.doesNotMatch((await mark('[data-case="optional"] [data-slot="field-label"]')).content, /\*/, "an optional label has no mark");
    assert.equal(await f.page.getByRole("textbox", { name: "Title", exact: true }).count(), 1, "the mark is not part of the field's name");
    assert.equal(await f.page.getByRole("radiogroup", { name: "Summary", exact: true }).count(), 1);
    assert.equal(await f.page.getByRole("heading", { name: "Display name", exact: true }).count(), 1);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
