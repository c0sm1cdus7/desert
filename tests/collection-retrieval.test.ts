import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import type { RecordView } from "../src/web/types.ts";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";

const record = (id: string, title: string, state = "active", extra = {}): RecordView =>
  ({ id, version: 1, facts: { title, state, ...extra } });

async function collectionFixture(records: readonly RecordView[], options: {
  loaded?: boolean; disabled?: boolean; fields?: readonly string[]; selectedId?: string;
} = {}) {
  const compiled = compile(Notebook).surface("human");
  const surface = { ...compiled, journeys: compiled.journeys.map(journey => journey.kind === "read"
    ? { ...journey, collection: options.fields ?? journey.collection } : journey) };
  return svelteBrowser(`<script lang="ts">
    import BankRenderer from "@desert/svelte/BankRenderer.svelte";
    import { presentCollection } from "@desert/interaction/bank-presenters.ts";
    const surface = ${JSON.stringify(surface)};
    const records = Object.freeze(${JSON.stringify(records)});
    let selectedId = $state(${JSON.stringify(options.selectedId ?? null)});
    let selections = $state(0);
    const node = $derived(presentCollection(surface, records, {
      loaded: ${options.loaded ?? true}, disabled: ${options.disabled ?? false}, selectedId,
    }));
  </script>
  <BankRenderer {node} onevent={event => {
    if (event.kind === "collection.select") { selectedId = event.id; selections += 1; }
  }} />
  <output aria-label="Selected test record">{selectedId ?? "none"}</output>
  <output aria-label="Selection calls">{selections}</output>
  <output aria-label="Source record order">{records.map(record => record.id).join(",")}</output>`);
}

test("collection search matches only displayed collection values, without changing records or selection", async () => {
  const f = await collectionFixture([
    record("id-only-token", "Zebra", "archived", { body: "body-only-token", privateFact: "private-only-token" }),
    record("second", "Alpha", "active"),
  ], { selectedId: "id-only-token" });
  try {
    const search = f.page.getByRole("searchbox", { name: "Search loaded records", exact: true });
    await search.fill("  ALPHA  ");
    assert.deepEqual(await f.page.locator(".record-button strong").allTextContents(), ["Alpha"]);
    await search.fill("archived");
    assert.deepEqual(await f.page.locator(".record-button strong").allTextContents(), ["Zebra"]);
    for (const hiddenValue of ["body-only-token", "private-only-token", "id-only-token", "Status"]) {
      await search.fill(hiddenValue);
      assert.equal(await f.page.locator(".record-button").count(), 0, `${hiddenValue} is not a collection value`);
      await f.page.getByRole("heading", { name: "No matching records.", exact: true }).waitFor();
      assert.equal(await f.page.getByRole("heading", { name: "Nothing here yet.", exact: true }).count(), 0);
    }
    await f.page.getByRole("button", { name: "Clear search", exact: true }).click();
    assert.equal(await search.inputValue(), "");
    assert.equal(await search.evaluate(element => element === document.activeElement), true);
    assert.equal(await f.page.getByRole("status", { name: "Selected test record" }).textContent(), "id-only-token");
    assert.equal(await f.page.getByRole("status", { name: "Selection calls" }).textContent(), "0");
    assert.equal(await f.page.locator('[aria-current="true"] strong').textContent(), "Zebra");
    assert.equal(await f.page.getByRole("status", { name: "Source record order" }).textContent(), "id-only-token,second");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("collection ordering is explicit, stable on equal values, and derives from its first displayed field", async () => {
  const records = [record("z", "Zulu"), record("b", "Alpha", "archived"), record("a", "Alpha"), record("m", "Beta")];
  for (const input of [records, [...records].reverse()]) {
    const f = await collectionFixture(input);
    try {
      await f.page.getByText("Sorted by Title · ascending", { exact: true }).waitFor();
      assert.deepEqual(await f.page.locator(".record-button strong").allTextContents(), ["Alpha", "Alpha", "Beta", "Zulu"]);
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
    await f.page.getByText("Sorted by Status · ascending", { exact: true }).waitFor();
    assert.deepEqual(await f.page.locator(".record-button strong").allTextContents(), ["active", "archived"]);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("unknown and known-empty collections stay distinct from a search with no matches", async () => {
  for (const loaded of [false, true]) {
    const f = await collectionFixture([], { loaded });
    try {
      const search = f.page.getByRole("searchbox", { name: "Search loaded records", exact: true });
      assert.equal(await search.isDisabled(), true);
      await f.page.getByRole("heading", { name: loaded ? "Nothing here yet." : "Waiting for your records.", exact: true }).waitFor();
      assert.equal(await f.page.getByRole("heading", { name: "No matching records.", exact: true }).count(), 0);
      assert.equal(await f.page.getByText("0 matching records", { exact: true }).count(), 0, "unread/empty is not a failed search");
      assert.deepEqual(f.errors, []);
    } finally { await f.close(); }
  }
});

test("local retrieval remains usable on loaded values without enabling disabled record actions", async () => {
  const f = await collectionFixture([record("a", "Alpha"), record("b", "Beta")], { disabled: true });
  try {
    const search = f.page.getByRole("searchbox", { name: "Search loaded records", exact: true });
    assert.equal(await search.isEnabled(), true);
    await search.fill("beta");
    await search.press("Enter");
    assert.deepEqual(await f.page.locator(".record-button strong").allTextContents(), ["Beta"]);
    assert.equal(await f.page.locator(".record-button").isDisabled(), true);
    assert.equal(await f.page.getByRole("status", { name: "Selection calls" }).textContent(), "0");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
