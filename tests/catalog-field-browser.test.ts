// Field in a real browser: what each primitive and purpose draws and emits. A trigger is one button carrying its
// disclosure as data and asking to open on press, ArrowDown and ArrowUp; a search well takes focus when it appears and
// clears through its own control; an accessible label names the editor without drawing; masked edits report validity.
import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";

const shared = 'labelVisibility="visible" required={false} invalid={false} disabled={false}';
const source = `<script lang="ts">
  import { Field, Form } from "@desert/svelte/catalog/index.ts";
  let opened = $state(0), expanded = $state(false), query = $state(""), amount = $state("12"), edits = $state([]), submitted = $state(0);
</script>
<main style="padding:24px;width:640px">
  <Field primitive="trigger" label="Country" ${shared} measure="choice" display={{ kind: "text", text: "Choose…", placeholder: true }}
    disclosure={{ id: "country-trigger", controls: "country-list", expanded, haspopup: "listbox" }} onopen={() => { opened += 1; expanded = !expanded; }} />
  <Field primitive="trigger" label="Labels" ${shared} measure="fill" display={{ kind: "tags", tags: [{ label: "Urgent", color: "red", state: "known" },
    { label: "Gone", state: "unavailable" }] }} disclosure={{ id: "labels-trigger", controls: "labels-list", expanded: false, haspopup: "dialog" }} />
  <Field primitive="input.text" label="Search in Notes" labelVisibility="accessible" required={false} invalid={false} disabled={false}
    measure="fill" purpose="search" placeholder="Search in Notes" value={query} clear focus="on-mount" onchange={value => query = value} />
  <Field primitive="input.text" label="Password" ${shared} measure="writing" purpose="current-password" value="secret" clear={false} />
  <Field primitive="input.text" label="Amount" ${shared} measure="amount" purpose="text" value={amount} clear
    mask={{ kind: "decimal", locale: "en-US", scale: 2 }} identity="amount" onchange={value => amount = value} onmasked={edit => edits = [...edits, edit]} />
  <Form label="Unlock" fill={true} submit={() => submitted += 1}><Field primitive="input.text" label="Name" ${shared} measure="writing" purpose="text" value="" clear /></Form>
  <output data-opened>{opened}</output><output data-query>{query}</output><output data-amount>{amount}</output>
  <output data-edits>{JSON.stringify(edits)}</output><output data-submitted>{submitted}</output>
</main>`;

test("field: a trigger is one native button with its disclosure; press, ArrowDown and ArrowUp ask to open", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    const trigger = f.page.locator("#country-trigger");
    assert.equal(await trigger.evaluate(node => node.tagName), "BUTTON");
    assert.equal(await trigger.getAttribute("aria-label"), "Country · Choose…");
    assert.equal(await trigger.getAttribute("aria-haspopup"), "listbox");
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");
    assert.equal(await trigger.getAttribute("aria-controls"), null);
    await trigger.click();
    assert.equal(await trigger.getAttribute("aria-expanded"), "true");
    assert.equal(await trigger.getAttribute("aria-controls"), "country-list");
    assert.equal(await trigger.getAttribute("data-state"), "open");
    await trigger.focus(); await f.page.keyboard.press("ArrowDown"); await f.page.keyboard.press("ArrowUp");
    assert.equal(await f.page.locator("[data-opened]").textContent(), "3");
    assert.equal(await f.page.locator('[data-field][data-measure="choice"]').count(), 1);
    const tags = f.page.locator("#labels-trigger");
    assert.equal(await tags.getAttribute("aria-label"), "Labels · Urgent, Gone");
    assert.equal(await tags.locator('[data-tag-state="unavailable"]').textContent(), "Gone");
    assert.equal(await tags.locator('.color-bullet[data-color="red"]').count(), 1, "a known tag with a color mounts its bullet");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("field: search takes focus on mount and clears through its own control; an accessible label draws nothing", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    const search = f.page.getByRole("searchbox", { name: "Search in Notes" });
    assert.equal(await search.evaluate(node => node === document.activeElement), true, "focus: on-mount focuses the editor");
    assert.equal(await f.page.locator("[data-search-field]").count(), 1);
    assert.equal(await f.page.getByText("Search in Notes", { exact: true }).count(), 0, "the accessible label is not drawn as text");
    await search.fill("weekly");
    assert.equal(await f.page.locator("[data-query]").textContent(), "weekly");
    await f.page.getByRole("button", { name: "Clear search", exact: true }).click();
    assert.equal(await f.page.locator("[data-query]").textContent(), "");
    const radius = await f.page.locator("[data-search-field]").evaluate(node => getComputedStyle(node).borderTopLeftRadius);
    const well = await f.page.locator(".field-well").first().evaluate(node => getComputedStyle(node).borderTopLeftRadius);
    assert.equal(radius, well, "the search well shares the field radius");
    const password = f.page.getByLabel("Password", { exact: true });
    assert.equal(await password.getAttribute("type"), "password");
    assert.equal(await f.page.getByRole("button", { name: "Clear Password" }).count(), 0, "clear={false} offers no clear control");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("field: masked edits report every validity and change only once complete; a filling form submits", { timeout: 30000 }, async () => {
  const f = await svelteBrowser(source);
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    const amount = f.page.getByLabel("Amount", { exact: true });
    await amount.fill("12.");
    await amount.fill("12.5");
    const edits = JSON.parse(await f.page.locator("[data-edits]").textContent() ?? "[]");
    assert.deepEqual(edits.at(-1), { value: "12.5", valid: true, complete: true });
    assert.ok(edits.some((edit: { complete: boolean }) => !edit.complete), "an incomplete edit is reported too");
    assert.equal(await f.page.locator("[data-amount]").textContent(), "12.5");
    const form = f.page.getByRole("form", { name: "Unlock" });
    assert.equal(await form.evaluate(node => getComputedStyle(node).display), "flex");
    await f.page.getByLabel("Name", { exact: true }).press("Enter");
    assert.equal(await f.page.locator("[data-submitted]").textContent(), "1");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
