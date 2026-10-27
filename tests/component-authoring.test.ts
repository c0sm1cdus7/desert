import assert from "node:assert/strict";
import test from "node:test";
import { Components, ViewTitles, defineView } from "../src/views/components.ts";
import { viewPorts } from "../src/views/authoring-ports.ts";
import { authoredViewData } from "../src/views/authored-view.ts";
import type { Message } from "../src/views/definition.ts";
import { defineModule } from "../src/modules/definition.ts";
import { composeProduct } from "../src/modules/compose.ts";
import { authoredNotebookSource } from "./fixtures/authored-notebook.ts";
import { fixtureText } from "./fixtures/messages.ts";

test("typed components compose independent content and derive stable internal identities", () => {
  const ports = viewPorts({ inputs: { notes: "collection" }, outputs: ["select"] });
  const make = () => defineView({ name: "notes", outputs: ports.outputs, content: [
    Components.Header({ title: fixtureText.notes }),
    Components.Text({ text: "Introduction" }),
    Components.Stack({ title: fixtureText.allNotes, items: [
      Components.Collection({ input: ports.inputs.notes, output: ports.output.select }),
    ] }),
  ] });
  const first = authoredViewData(make());
  defineView({ name: "unrelated", content: [Components.Header({ title: fixtureText.elsewhere })] });
  assert.deepEqual(authoredViewData(make()), first);
  assert.deepEqual(first.content.map(item => item.kind), ["header", "text", "stack"]);
  const header = first.content[0];
  if (header?.kind !== "header") throw new Error("header required");
  assert.equal(header.id, "content.0");
  const stack = first.content[2];
  assert.equal(stack?.kind, "stack");
  if (stack?.kind !== "stack") throw new Error("stack required");
  assert.equal(stack.id, "content.2");
  assert.deepEqual(stack.items, [{ kind: "collection", id: "content.2.items.0", input: "notes", output: "select" }]);
  assert.ok(Object.isFrozen(first.content));
});

test("workspace components keep View object identity while emitting the canonical protocol", () => {
  const navigation = defineView({ name: "navigation", content: [
    Components.Header({ title: ViewTitles.product }), Components.Navigation(),
  ] });
  const workspace = defineView({ name: "workspace", leftDock: Components.Dock(navigation),
    content: [Components.Destination()] });
  assert.equal(workspace.leftDock.view, navigation);
  assert.deepEqual(authoredViewData(workspace).leftDock, { kind: "view", view: "navigation" });
});

test("component authoring rejects raw descriptors, consumer geometry and manual renderer identities", () => {
  const unsafeHeader = Components.Header as (value: unknown) => unknown;
  const unsafeView = defineView as (value: unknown) => unknown;
  for (const extra of [{ id: "my-header" }, { kind: "header" }, { style: undefined }, { class: "large" }]) {
    assert.throws(() => unsafeHeader({ title: "Notes", ...extra }), /INVALID_COMPONENT_PROPERTIES/);
  }
  assert.throws(() => unsafeView({ name: "notes", content: [{ kind: "header", id: "header", title: "Notes" }] }), /UNREGISTERED_VIEW_COMPONENT/);
  assert.throws(() => unsafeView({ name: "notes", content: [], id: "alternate" }), /INVALID_VIEW_DECLARATION/);
  assert.throws(() => unsafeView({ name: "notes", content: [], style: undefined }), /INVALID_VIEW_DECLARATION/);
});

test("canonical constraints still reject illegal composition and undeclared outputs", () => {
  const unsafeStack = Components.Stack as (value: unknown) => unknown;
  const unsafeView = defineView as (value: unknown) => unknown;
  assert.throws(() => unsafeStack({ title: "Content", items: [Components.Header({ title: fixtureText.nested })] }), /INVALID_COMPONENT_PROPERTIES/);
  assert.throws(() => unsafeView({ name: "notes", content: [],
    topDock: Components.Toolbar({ actions: [{ output: "missing", label: fixtureText.save, icon: "save" }] }),
  }), /UNDECLARED_VIEW_OUTPUT/);
  const ports = viewPorts({ inputs: { draft: "form" }, outputs: [] });
  const unsafeCollection = Components.Collection as (value: unknown) => unknown;
  assert.throws(() => unsafeCollection({ input: ports.inputs.draft, output: "select" }), /INVALID_COMPONENT_INPUT/);
});

test("toolbar action properties remain closed at runtime even when passed through variables", () => {
  const unsafeToolbar = Components.Toolbar as (value: unknown) => unknown;
  for (const extra of [{ class: "p-0" }, { style: "padding:0" }, { padding: undefined }]) {
    const action = { output: "save", label: fixtureText.save, icon: "save", ...extra };
    assert.throws(() => unsafeToolbar({ actions: [action] }), /INVALID_COMPONENT_PROPERTIES/);
  }
  const toolbar = Components.Toolbar({ actions: [{ output: "save", label: fixtureText.save, icon: "save" }] });
  assert.deepEqual(toolbar, { kind: "toolbar", actions: [{ output: "save", label: fixtureText.save, icon: "save" }] });
});

test("untyped output declarations still pass through canonical membership validation", () => {
  const unsafeView = defineView as (value: unknown) => unknown;
  const ports = viewPorts({ inputs: { records: "collection" }, outputs: ["select"] });
  const toolbar = Components.Toolbar({ actions: [{ output: "select", label: fixtureText.select, icon: "open" }] });
  const collection = Components.Collection({ input: ports.inputs.records, output: ports.output.select });
  const variants = [
    { topDock: toolbar, content: [] }, { bottomDock: toolbar, content: [] },
    { content: [collection] }, { content: [Components.Stack({ title: fixtureText.records, items: [collection] })] },
  ];
  for (const variant of variants) {
    assert.throws(() => unsafeView({ name: "records", outputs: ["other"], ...variant }), /UNDECLARED_VIEW_OUTPUT/);
  }
  assert.deepEqual(authoredViewData(defineView({ name: "records", outputs: ports.outputs,
    content: [Components.Stack({ title: fixtureText.records, items: [collection] })] })), {
    version: "desert.view/1", id: "records", outputs: ["select"], content: [{ kind: "stack", id: "content.0",
      title: fixtureText.records, items: [{ kind: "collection", id: "content.0.items.0", input: "records", output: "select" }] }],
  });
});

test("component values snapshot authored properties without getters or later mutations", () => {
  const source: { title: Message } = { title: fixtureText.original };
  const header = Components.Header(source);
  source.title = fixtureText.changedWorkspace;
  const result = defineView({ name: "notes", content: [header] });
  assert.deepEqual(result.content[0]?.title, fixtureText.original);
  let invoked = false;
  assert.throws(() => Components.Header({ get title() { invoked = true; return fixtureText.original; } }), /INVALID_COMPONENT_PROPERTIES/);
  assert.equal(invoked, false);
});

test("module admission requires real component-authored Views rather than matching wire data", () => {
  const view = defineView({ name: "home", content: [Components.Header({ title: fixtureText.home })] });
  for (const forged of [{ ...view }, structuredClone(view), authoredViewData(view)]) {
    assert.throws(() => defineModule({ id: "raw", views: [forged] } as never), /VIEW_COMPONENT_AUTHORING_REQUIRED/);
  }
  assert.equal(defineModule({ id: "valid", views: [view] }).id, "valid");
});

test("root composition applies the same authoring admission without a direct wire escape", () => {
  const source = authoredNotebookSource();
  assert.equal(composeProduct(source).viewProgram.workspace, "workspace");
  assert.throws(() => composeProduct({ ...source, views: source.views.map(view => ({ ...view })) }),
    /VIEW_COMPONENT_AUTHORING_REQUIRED/);
});
