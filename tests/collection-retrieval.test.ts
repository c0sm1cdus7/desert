import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import type { HumanSurface, RecordView } from "../src/web/types.ts";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { retrieveCollection } from "../src/svelte/collection-retrieval.ts";
import { notebookScope } from "./fixtures/notebook-scope.ts";

const record = (id: string, title: string, state = "active", extra = {}): RecordView =>
  ({ id, version: 1, facts: { title, state, ...extra } });

async function collectionFixture(records: readonly RecordView[], options: {
  loaded?: boolean; disabled?: boolean; fields?: readonly string[]; selectedId?: string; inView?: boolean;
} = {}) {
  const compiled = compile(Notebook).surface("human") as HumanSurface;
  if (compiled.kind !== "human") throw new Error("Expected Notebook human surface");
  const surface = { ...compiled, journeys: compiled.journeys.map(journey => journey.kind === "read"
    ? { ...journey, collection: options.fields ?? journey.collection } : journey) };
  const scope = notebookScope(surface);
  return svelteBrowser(`<script lang="ts">
    import BankRenderer from "@desert/svelte/catalog/renderer/bank-renderer/BankRenderer.svelte";
    import ViewContent from "@desert/svelte/catalog/renderer/view-content/ViewContent.svelte";
    import { presentCollection } from "@desert/interaction/bank-presenters.ts";
    import type { View } from "@desert/views/schema.ts";
    const surface = ${JSON.stringify(surface)};
    const scope = ${JSON.stringify(scope)};
    const records = Object.freeze(${JSON.stringify(records)});
    let selectedId = $state(${JSON.stringify(options.selectedId ?? null)});
    let selections = $state(0);
    const node = $derived(presentCollection(surface, records, {
      loaded: ${options.loaded ?? true}, disabled: ${options.disabled ?? false}, selectedId,
    }, scope));
    const view = { version: "desert.view/1", id: "notes", outputs: ["select"], content: [
      { kind: "stack", id: "all-notes", title: "All notes", items: [
        { kind: "collection", id: "notes", input: "notes", output: "select" },
      ] },
    ] } as const satisfies View;
    const resolved = $derived({ view, bindings: { notes: node }, disabledOutputs: [] });
  </script>
  {#if ${options.inView ?? false}}
  <ViewContent {resolved} onevent={event => {
    if (event.kind === "surface.invoke" && event.intent.kind === "view.output") {
      selectedId = event.intent.recordId; selections += 1;
    }
  }} />
  {:else}
  <BankRenderer {node} onevent={event => {
    if (event.kind === "collection.select") { selectedId = event.id; selections += 1; }
  }} />
  {/if}
  <output aria-label="Selected test record">{selectedId ?? "none"}</output>
  <output aria-label="Selection calls">{selections}</output>
  <output aria-label="Source record order">{records.map(record => record.id).join(",")}</output>`);
}

test("retrieval matches only exposed displayed values without changing the source records", () => {
  const records = [
    record("id-only-token", "Zebra", "archived", { body: "body-only-token", privateFact: "private-only-token" }),
    record("second", "Alpha", "active"),
  ];
  const before = structuredClone(records);
  assert.deepEqual(retrieveCollection(records, ["title", "state"], "  ALPHA  ").map(item => item.id), ["second"]);
  assert.deepEqual(retrieveCollection(records, ["title", "state"], "archived").map(item => item.id), ["id-only-token"]);
  for (const query of ["body-only-token", "private-only-token", "id-only-token", "Status"])
    assert.deepEqual(retrieveCollection(records, ["title", "state"], query), [], `${query} is not an exposed value`);
  assert.deepEqual(records, before);
});

test("collection ordering stays deterministic without an automatic sorting caption", async () => {
  const records = [record("z", "Zulu"), record("b", "Alpha", "archived"), record("a", "Alpha"), record("m", "Beta")];
  for (const input of [records, [...records].reverse()]) {
    const f = await collectionFixture(input);
    try {
      assert.equal(await f.page.getByText(/^Sorted by /).count(), 0, "sorting does not add presentation copy");
      assert.deepEqual(await f.page.locator(".record-button strong").allTextContents(), ["Alpha", "Alpha", "Beta", "Zulu"]);
      assert.deepEqual(await f.page.locator("[data-record-metadata]").allTextContents(),
        ["Status · active", "Status · archived", "Status · active", "Status · active"]);
      await f.page.locator(".record-button").nth(0).click();
      assert.equal(await f.page.getByRole("status", { name: "Selected test record" }).textContent(), "a");
      await f.page.locator(".record-button").nth(1).click();
      assert.equal(await f.page.getByRole("status", { name: "Selected test record" }).textContent(), "b");
      assert.equal(await f.page.getByRole("status", { name: "Source record order" }).textContent(), input.map(record => record.id).join(","));
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  }
  const f = await collectionFixture([record("a", "A title", "archived"), record("z", "Z title", "active")], { fields: ["state", "title"] });
  try {
    assert.equal(await f.page.getByText(/^Sorted by /).count(), 0);
    assert.deepEqual(await f.page.locator(".record-button strong").allTextContents(), ["active", "archived"]);
    assert.deepEqual(await f.page.locator("[data-record-metadata]").allTextContents(), ["Title · Z title", "Title · A title"]);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

for (const loaded of [false, true]) {
  test(`${loaded ? "known-empty" : "unknown"} collection has no sorting caption and is not a failed search`, async () => {
    const f = await collectionFixture([], { loaded });
    try {
      assert.equal(await f.page.getByRole("searchbox").count(), 0, "collection content never owns search");
      assert.equal(await f.page.getByText(/^Sorted by /).count(), 0);
      if (loaded) await f.page.getByRole("heading", { name: "Nothing here yet.", exact: true }).waitFor();
      else await f.page.locator('[data-collection-state="loading"][aria-busy="true"]').waitFor();
      assert.equal(await f.page.getByRole("heading", { name: "No matching records.", exact: true }).count(), 0);
      assert.equal(await f.page.getByText("0 matching records", { exact: true }).count(), 0, "unread/empty is not a failed search");
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  });
}

test("collection content has no search controls and keeps disabled record actions disabled", async () => {
  const f = await collectionFixture([record("a", "Alpha"), record("b", "Beta")], { disabled: true });
  try {
    assert.equal(await f.page.getByRole("searchbox").count(), 0);
    assert.equal(await f.page.getByText(/^Sorted by /).count(), 0);
    assert.equal(await f.page.getByRole("button", { name: "Clear search", exact: true }).count(), 0);
    assert.deepEqual(await f.page.locator(".record-button strong").allTextContents(), ["Alpha", "Beta"]);
    for (const button of await f.page.locator(".record-button").all()) assert.equal(await button.isDisabled(), true);
    assert.equal(await f.page.getByRole("status", { name: "Selection calls" }).textContent(), "0");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("a View stack aligns All notes with collection text without an invented subtitle", async context => {
  const f = await collectionFixture([record("b", "Beta"), record("a", "Alpha")], { inView: true });
  try {
    await f.page.addStyleTag({ content: await rendererCss() });
    for (const width of [390, 1280]) {
      await f.page.setViewportSize({ width, height: 900 });
      const heading = f.page.getByRole("heading", { name: "All notes", exact: true });
      assert.equal(await heading.isVisible(), true);
      assert.equal(await f.page.locator(".place-stack-description").count(), 0);
      assert.equal(await f.page.getByText(/^Sorted by /).count(), 0);
      const inset = await f.page.evaluate(() => {
        const textLeft = (selector: string) => {
          const range = document.createRange();
          range.selectNodeContents(document.querySelector(selector)!);
          return range.getBoundingClientRect().left;
        };
        return { heading: textLeft(".place-stack-title h2"), row: textLeft(".record-button strong") };
      });
      context.diagnostic(`${width}px reading guide: heading=${inset.heading}, row=${inset.row}`);
      assert.ok(Math.abs(inset.heading - inset.row) <= 1,
        `heading and record text share the reading guide within the existing 1px pane border at ${width}px`);
    }
    await f.page.getByRole("button", { name: /Alpha/ }).click();
    assert.equal(await f.page.getByRole("status", { name: "Selected test record" }).textContent(), "a");
    assert.equal(await f.page.getByRole("status", { name: "Selection calls" }).textContent(), "1");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
