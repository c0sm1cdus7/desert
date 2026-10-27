import assert from "node:assert/strict";
import test from "node:test";
import { viewIdentity, viewSearchResults, viewSearchSelection } from "../src/svelte/catalog/compositions/view-workspace/workspace-data.ts";
import type { ResolvedView } from "../src/views/resolved.ts";
import { program } from "./fixtures/view-program.ts";

const resolved: ResolvedView = { view: program.views[1], disabledOutputs: [], bindings: {
  records: { version: "desert.bank-node/1", kind: "collection", object: "note", fields: ["title"],
    labels: { "note.title": "Title" }, createLabel: "New note", loaded: true, disabled: false, selectedId: null,
    records: [{ id: "record-1", version: 1, facts: { title: "A private thought" } }] },
} };

test("workspace adaptation preserves authored identity and projects only authorized collection values", () => {
  assert.deepEqual(viewIdentity(resolved, "Fallback"), resolved.view.content[0]);
  assert.deepEqual(viewSearchResults(resolved, "  "), []);
  const results = viewSearchResults(resolved, "private thought");
  assert.equal(results.length, 1);
  assert.ok(results[0]?.kind === "content");
  assert.equal(results[0].title, "A private thought");
  assert.deepEqual(viewSearchSelection(resolved, results[0]!.id), { kind: "surface.invoke", intent: {
    kind: "view.output", view: "notes", output: "select", recordId: "record-1",
  } });
  assert.equal(viewSearchSelection({ ...resolved, disabledOutputs: ["select"] }, results[0]!.id), null);
  assert.equal(viewSearchSelection(resolved, "unknown"), null);
});

test("catalog search reuses the canonical registered entry inventory", () => {
  const catalog = { ...resolved, view: program.views[4] };
  assert.ok(viewSearchResults(catalog, "date").some(item => item.kind === "bank" && item.id === "control.date"));
  assert.equal(viewSearchSelection(catalog, "control.date"), null);
});

test("overlay collection results reuse displayed titles and ordering, never hidden fields or IDs", () => {
  const node = resolved.bindings.records;
  assert.ok(node?.kind === "collection");
  const collection = { ...resolved, bindings: { records: { ...node, records: [
    { id: "z", version: 1, facts: { title: "Zebra" } },
    { id: "private-id-token", version: 1, facts: { title: "", body: "private-body-token" } },
    { id: "b", version: 1, facts: { title: "Alpha" } },
  ] } } };
  const untitled = viewSearchResults(collection, "Untitled");
  assert.equal(untitled.length, 1);
  assert.ok(untitled[0]?.kind === "content");
  assert.equal(untitled[0].title, "Untitled");
  assert.deepEqual(viewSearchResults(collection, "private-id-token"), []);
  assert.deepEqual(viewSearchResults(collection, "private-body-token"), []);
  assert.deepEqual(viewSearchResults(collection, "a").filter(result => result.kind === "content" && result.id.startsWith("["))
    .map(result => result.kind === "content" ? result.title : "unexpected"), ["Alpha", "Zebra"]);
  assert.equal(viewSearchSelection(collection, untitled[0]!.id)?.kind, "surface.invoke");
});

test("media search uses accessible descriptions and kinds, never legacy titles or private associations", () => {
  const node=resolved.bindings.records;
  assert.ok(node?.kind==='collection');
  const media:ResolvedView={...resolved,bindings:{records:{...node,object:'private-media',fields:['image','description'],
    presentation:{kind:'media-grid',image:'image',description:'description'},records:[
      {id:'image',version:1,facts:{title:'legacy-secret-title',image:{kind:'asset',reference:'b7000000-0000-4000-8000-000000000003'},description:'Mountain at sunset',collections:['private-collection']}},
      {id:'video',version:1,facts:{title:'legacy-secret-video',image:{kind:'asset',reference:'b7000000-0000-4000-8000-000000000004',media:'video'},description:''}},
      {id:'audio',version:1,facts:{title:'legacy-secret-audio',image:{kind:'asset',reference:'b7000000-0000-4000-8000-000000000005',media:'audio'},description:'Sea waves'}},
    ]}}};
  for(const [query,title] of [['mountain','Image'],['video','Video'],['waves','Audio']]){
    const result=viewSearchResults(media,query!)[0];assert.ok(result?.kind==='content');assert.equal(result.title,title);
  }
  for(const query of ['legacy-secret','private-collection','b7000000'])assert.deepEqual(viewSearchResults(media,query),[]);
  assert.ok(viewSearchSelection(media,viewSearchResults(media,'mountain')[0]!.id));
});
