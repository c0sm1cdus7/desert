import test from "node:test";
import assert from "node:assert/strict";
import { compileViewProgram } from "../src/views/program.ts";
import { program, surface } from "./fixtures/view-program.ts";
import { runtimeFixture, until } from "./fixtures/view-program-runtime.ts";

export function overviewProgram() {
  const value = structuredClone(program) as unknown as Record<string, any>;
  value.views[0].outputs = ["note"];
  value.views[0].content = [{ kind: "header", id: "heading", title: "Home" },
    { kind: "attention", id: "attention" },
    { kind: "stack", id: "recent", title: "Notes", items: [
      { kind: "collection", id: "recent-notes", input: "notes", output: "note" }] }];
  value.journeys[0].collections = [{ input: "notes", read: program.journeys[1].id, limit: 4 }];
  value.journeys[0].outputs = [{ view: "home", output: "note", action: { kind: "select" } }];
  return value;
}

test("Overview collections bind only installed exposed reads; presentation cannot invent data authority", () => {
  const value = overviewProgram();
  assert.doesNotThrow(() => compileViewProgram(value, surface));
  for (const read of ["private-read", program.journeys[2].id]) {
    const bad = overviewProgram(); bad.journeys[0].collections[0].read = read;
    assert.throws(() => compileViewProgram(bad, surface), /INVALID_OVERVIEW_READ/);
  }
  const duplicate = overviewProgram(); duplicate.journeys[0].collections.push(duplicate.journeys[0].collections[0]);
  assert.throws(() => compileViewProgram(duplicate, surface), /INVALID_OVERVIEW_INPUT/);
  const hidden = overviewProgram(); hidden.journeys[0].collections[0].where = { field: "owner", value: "any" };
  assert.throws(() => compileViewProgram(hidden, surface), /INVALID_OVERVIEW_FILTER/);
});

test("A forward destination remains content; a toolbar only offers commands or Back", () => {
  const value = structuredClone(program) as unknown as Record<string, any>;
  value.views[0].content.splice(1);
  value.views[0].topDock = { kind: "toolbar", actions: [{ output: "notes", label: "Notes", icon: "open" }] };
  assert.throws(() => compileViewProgram(value, surface), /FORWARD_NAVIGATION_IN_TOOLBAR/);
});

test("Home shows a real read projection and selection resolves only a visible authorized record", async t => {
  const { model, emit, records, calls } = await runtimeFixture(t, { definition: overviewProgram() });
  await until(() => { const node = model.snapshot().resolved.bindings.notes; return node?.kind === "collection" && node.loaded; });
  const node = model.snapshot().resolved.bindings.notes;
  assert.equal(node?.kind, "collection");
  assert.deepEqual(node.records.map(record => record.id), records.map(record => record.id));
  assert.equal(model.snapshot().state.detail, null);
  assert.equal(calls.some(call => call.method === "prepare" || call.method === "accept"), false);
  assert.throws(() => emit({ kind:"surface.invoke", intent:{kind:"view.output",view:"home",output:"note",recordId:"foreign-record"} }), /INVALID_VIEW_RECORD/);
  emit({ kind:"surface.invoke", intent:{kind:"view.output",view:"home",output:"note",recordId:records[0]!.id} });
  await until(() => model.snapshot().state.detail?.id === records[0]!.id);
  assert.equal(model.snapshot().activeDestination, "notes");
});

test("Back uses visited destinations rather than a forward journey disguised as an arrow", async t => {
  const value = structuredClone(program) as unknown as Record<string, any>;
  value.views[4].outputs = ["back"];
  value.views[4].topDock = {kind:"toolbar",actions:[{output:"back",label:"Back",icon:"back"}]};
  value.journeys[3].outputs = [{view:"catalog",output:"back",action:{kind:"back"}}];
  const {model,emit} = await runtimeFixture(t,{definition:value});
  model.navigate("notes"); model.navigate("catalog");
  emit({kind:"surface.invoke",intent:{kind:"back"}});
  assert.equal(model.snapshot().activeDestination,"notes");
  model.navigate("home"); model.navigate("catalog");
  emit({kind:"surface.invoke",intent:{kind:"back"}});
  assert.equal(model.snapshot().activeDestination,"home");
});
