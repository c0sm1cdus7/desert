// The nonvisual registries of design §5: focus by key and reveal by id are closures registered by foundations and called
// by compositions, so neither ever touches an element. Each is a plain factory plus a context pair for a component subtree.
import assert from "node:assert/strict";
import test from "node:test";
import { focusScope } from "../src/svelte/infra/focus-scope.ts";
import { regionRegistry } from "../src/svelte/infra/region-registry.ts";
import { renderServer } from "./fixtures/svelte-server.ts";

test("focus scope: focus runs the closure registered under the key and reports what it returned", () => {
  const scope = focusScope(), calls: string[] = [];
  scope.register("place-title", () => { calls.push("title"); return true; });
  scope.register("search:notes", () => { calls.push("search"); return false; });
  assert.equal(scope.focus("place-title"), true);
  assert.equal(scope.focus("search:notes"), false);
  assert.equal(scope.focus("catalog-return:notes"), false, "an unregistered key focuses nothing");
  assert.deepEqual(calls, ["title", "search"]);
});

test("focus scope: a later registration replaces an earlier one, and only the current registration's release removes it", () => {
  const scope = focusScope();
  const releaseOld = scope.register("row:1", () => false);
  const releaseNew = scope.register("row:1", () => true);
  releaseOld();
  assert.equal(scope.focus("row:1"), true, "the replaced instance's release leaves the new one registered");
  releaseNew();
  assert.equal(scope.focus("row:1"), false);
});

test("focus scope: a newer registration of a key shadows the older one until it is released", () => {
  // A search result and the home card that show the same record answer to one return key: the one mounted last (the
  // open search) takes focus, and the home card answers again once the search is gone.
  const scope = focusScope(), calls: string[] = [];
  scope.register("catalog-return:fuji", () => { calls.push("home"); return true; });
  const releaseSearch = scope.register("catalog-return:fuji", () => { calls.push("search"); return true; });
  assert.equal(scope.focus("catalog-return:fuji"), true);
  releaseSearch();
  assert.equal(scope.focus("catalog-return:fuji"), true);
  assert.deepEqual(calls, ["search", "home"]);
});

test("focus scope: the last activated key is remembered for a return", () => {
  const scope = focusScope();
  assert.equal(scope.lastActivated(), null);
  scope.activated("catalog-return:alpha");
  scope.activated("catalog-return:beta");
  assert.equal(scope.lastActivated(), "catalog-return:beta");
});

test("region registry: reveal resolves what the region's closure resolves, with the focus request passed through", async () => {
  const registry = regionRegistry(), requests: boolean[] = [];
  registry.register("entry:field", async focus => { requests.push(focus); return true; });
  assert.equal(await registry.reveal("entry:field", true), true);
  assert.equal(await registry.reveal("entry:field", false), true);
  assert.equal(await registry.reveal("entry:missing", true), false, "an unknown id reveals nothing");
  assert.deepEqual(requests, [true, false]);
});

test("region registry: a replaced region's release does not remove its successor", async () => {
  const registry = regionRegistry();
  const releaseOld = registry.register("about", async () => false);
  const releaseNew = registry.register("about", async () => true);
  releaseOld();
  assert.equal(await registry.reveal("about", false), true);
  releaseNew();
  assert.equal(await registry.reveal("about", false), false);
});

test("context: a provided scope and registry reach a descendant, and nothing reaches a tree that provided none", async () => {
  const child = `<script lang="ts">
  import { useFocusScope } from "@desert/svelte/infra/focus-scope.ts";
  import { useRegionRegistry } from "@desert/svelte/infra/region-registry.ts";
  const scope = useFocusScope(), registry = useRegionRegistry();
  scope?.register("child", () => true);
</script><p>{scope ? "scope" : "no-scope"} {registry ? "registry" : "no-registry"}</p>`;
  const provided = await renderServer(`<script lang="ts">
  import Child from "./Child.svelte";
  import { provideFocusScope } from "@desert/svelte/infra/focus-scope.ts";
  import { provideRegionRegistry } from "@desert/svelte/infra/region-registry.ts";
  const scope = provideFocusScope(); provideRegionRegistry();
</script><Child /><p>{scope.focus("child") ? "focused" : "unfocused"}</p>`, { "Child.svelte": child });
  assert.match(provided, /<p>scope registry<\/p>/);
  assert.match(provided, /<p>focused<\/p>/, "the parent focuses what its child registered");
  const bare = await renderServer(`<script lang="ts">import Child from "./Child.svelte";</script><Child />`, { "Child.svelte": child });
  assert.match(bare, /<p>no-scope no-registry<\/p>/);
});
