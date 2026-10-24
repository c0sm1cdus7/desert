// Slices 3–4, composition lane C: recomposed from catalog pieces, the collections, states, attention, destination and
// context compositions keep their behaviour: rows open, explain and return focus by key, states announce themselves,
// and every case reflows at 320px and at 200% text.
import assert from "node:assert/strict";
import test from "node:test";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { renderCases } from "./fixtures/parity.ts";
import { compositionCases } from "./fixtures/compositions-c-cases.ts";

const behaviour = `<script lang="ts">
  import Collection from "@desert/svelte/catalog/compositions/collection/Collection.svelte";
  import CollectionState from "@desert/svelte/catalog/compositions/collection-state/CollectionState.svelte";
  import AttentionList from "@desert/svelte/catalog/compositions/attention-list/AttentionList.svelte";
  import AttentionStatus from "@desert/svelte/catalog/compositions/attention-status/AttentionStatus.svelte";
  import ViewDestinationLink from "@desert/svelte/catalog/compositions/view-destination-link/ViewDestinationLink.svelte";
  import ContextPanel from "@desert/svelte/catalog/compositions/context-panel/ContextPanel.svelte";
  import List from "@desert/svelte/catalog/foundations/list/List.svelte";
  import { provideFocusScope } from "@desert/svelte/infra/focus-scope.ts";
  Object.assign(window, { scope: provideFocusScope() });
  let events = $state([]);
  const node = { version: "desert.bank-node/1", kind: "collection", object: "note", fields: ["title"], labels: { "note.title": "Title" },
    loaded: true, disabled: false, selectedId: "2", records: [{ id: "1", version: 1, facts: { title: "First" } }, { id: "2", version: 1, facts: { title: "Second" } }] };
  const attention = { loaded: true, error: "The attention list could not be refreshed.", objectSignals: {}, items: [
    { id: "draft", journey: "note", title: "Finish your note", description: "Continue where you left off.", available: true, signals: [] },
    { id: "old", journey: "note", title: "Saved activity", description: "Needs a compatible version.", available: false, signals: [] }] };
  const signal = { version: "desert.attention/1", recipient: "identity", reason: "activity.resume", resolution: "producer",
    source: { kind: "activity", id: "10000000-0000-4000-8000-000000000011", revision: 1, journey: "edit" },
    target: { kind: "object", object: "task", id: "10000000-0000-4000-8000-000000000001" } };
</script>
<main style="display:grid;gap:16px;padding:16px">
  <div data-case="records"><Collection {node} select={id => events.push("select " + id)} /></div>
  <div data-case="closed"><Collection node={{ ...node, disabled: true, records: node.records.map(record => ({ ...record, id: record.id + "0" })) }} select={id => events.push("closed " + id)} /></div>
  <div data-case="loading"><CollectionState loaded={false} /></div>
  <div data-case="empty"><CollectionState loaded createLabel="New note" /></div>
  <div data-case="offline"><CollectionState loaded={false} connection="offline" /></div>
  <div data-case="attention"><AttentionList state={attention} resume={id => events.push("resume " + id)} /></div>
  <div data-case="status"><AttentionStatus signals={[signal, signal]} /></div>
  <div data-case="link"><ViewDestinationLink view="home" output="notes" label="Notes" available onevent={event => events.push(JSON.stringify(event))} /></div>
  <div data-case="link-closed"><ViewDestinationLink view="home" output="trash" label="Trash" available={false} reason="Reconnect to open it."
    onevent={event => events.push(JSON.stringify(event))} /></div>
  <div data-case="context"><ContextPanel object="task" fields={[]} facts={{}} labels={{}}
    actions={[{ id: "archive", label: "Archive", available: true, invoke: () => events.push("archive") },
      { id: "share", label: "Share", available: false, invoke: () => events.push("share") }]} /></div>
  <div data-case="busy-facts"><List kind="facts" measure="reading" busy /></div>
  <output data-events>{JSON.stringify(events)}</output>
</main>`;

test("lane C keeps its behaviour: rows open, explain and return focus by key; states announce themselves", { timeout: 60000 }, async () => {
  const f = await renderCases(behaviour, {}, await rendererCss());
  try {
    const { page } = f, inCase = (name: string) => page.locator(`[data-case="${name}"]`);
    // A collection row opens its record, marks the shown one, and registers its record id in the focus scope.
    await inCase("records").getByRole("button", { name: "First" }).click();
    const second = inCase("records").getByRole("button", { name: "Second" });
    assert.equal(await second.getAttribute("aria-current"), "true");
    assert.equal(await page.evaluate(() => Reflect.get(window, "scope").focus("2")), true);
    assert.equal(await second.evaluate(element => element === document.activeElement), true);
    assert.deepEqual(await inCase("closed").getByRole("button").evaluateAll(buttons => buttons.map(button => button.hasAttribute("disabled"))), [true, true]);
    // Collection states: one labelled group, busy only while loading; the empty and offline titles are level-2 headings.
    const group = (name: string) => inCase(name).getByRole("group", { name: "Collection state", exact: true });
    assert.deepEqual(await Promise.all(["loading", "empty", "offline"].map(name => group(name).getAttribute("aria-busy"))), ["true", "false", "false"]);
    assert.equal(await group("loading").getByRole("status").textContent(), "Loading content…");
    assert.equal(await inCase("busy-facts").locator("dl").getAttribute("aria-busy"), "true", "List (busy): a fact list can be busy too");
    assert.equal(await inCase("empty").getByRole("heading", { level: 2, name: "Nothing here yet." }).count(), 1);
    assert.equal(await inCase("empty").getByText("Use “New note” to get started.", { exact: true }).count(), 1);
    assert.equal(await inCase("offline").getByRole("heading", { level: 2, name: "Controller unavailable." }).count(), 1);
    // The Status foundation's offline tone is a status: the offline state is now announced (it was only a heading).
    assert.equal((await inCase("offline").getByRole("status").innerText()).replace(/\s+/g, " ").trim(), "Controller unavailable. Reconnect to load this content.");
    // Attention: the failure is announced, an available item resumes, an unavailable one stays visible and closed.
    assert.equal(await inCase("attention").getByRole("status").textContent(), "The attention list could not be refreshed.");
    await inCase("attention").getByRole("button", { name: /Finish your note/ }).click();
    assert.equal(await inCase("attention").getByRole("button", { name: /Saved activity/ }).isDisabled(), true);
    assert.equal(await inCase("status").getByRole("button").count(), 0, "the attention status reads; it is not a control");
    assert.equal((await inCase("status").innerText()).trim(), "2 pending activities require your attention");
    // A destination link invokes its output; a closed one explains why.
    await inCase("link").getByRole("button", { name: "Notes" }).click();
    const closed = inCase("link-closed").getByRole("button", { name: "Trash" });
    assert.equal(await closed.isDisabled(), true);
    assert.equal(await closed.getAttribute("title"), "Reconnect to open it.");
    assert.equal(await page.locator(`#${await closed.getAttribute("aria-describedby")}`).textContent(), "Reconnect to open it.");
    // Context actions: the group is named by its heading; an available action runs, an unavailable one cannot.
    const actions = inCase("context").getByRole("group", { name: "Actions" });
    await actions.getByRole("button", { name: "Archive" }).click();
    assert.equal(await actions.getByRole("button", { name: "Share" }).isDisabled(), true);
    assert.deepEqual(JSON.parse(await page.locator("[data-events]").textContent() ?? "[]"), ["select 1", "resume draft",
      JSON.stringify({ kind: "surface.invoke", intent: { kind: "view.output", view: "home", output: "notes" } }), "archive"]);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("lane C reflows at 320px and at 200% text without scrolling sideways", { timeout: 60000 }, async () => {
  const fluid = compositionCases.replace('style="display:grid;gap:24px;padding:16px;width:640px"', 'style="display:grid;gap:24px;padding:16px"');
  const f = await renderCases(fluid, {}, await rendererCss(), { width: 320, height: 1400 });
  try {
    for (const size of ["100%", "200%"]) {
      await f.page.evaluate(value => document.documentElement.style.setProperty("font-size", value), size);
      const overflowing = await f.page.evaluate(() => [...document.querySelectorAll("[data-case]")]
        .filter(host => host.scrollWidth > host.clientWidth + 1 || host.getBoundingClientRect().right > innerWidth + 1)
        .map(host => host.getAttribute("data-case")));
      assert.deepEqual(overflowing, [], size);
      assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, size);
    }
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
