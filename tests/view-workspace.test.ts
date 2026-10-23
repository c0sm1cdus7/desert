import test from "node:test";
import assert from "node:assert/strict";
import { compileViewProgram } from "../src/views/program.ts";
import { resolveProgramWorkspace } from "../src/views/program-workspace.ts";
import { composeProduct } from "../src/index.ts";
import { authoredNotebookSource } from "./fixtures/authored-notebook.ts";
import { program, surface } from "./fixtures/view-program.ts";

const navigation = {
  version: "desert.view/1", id: "workspace-navigation", content: [
    { kind: "header", id: "navigation-title", title: { kind: "product-title" } },
    { kind: "navigation" },
  ],
};
const workspace = {
  version: "desert.view/1", id: "workspace", leftDock: { kind: "view", view: navigation.id },
  content: [{ kind: "destination" }],
};
function candidate() {
  return structuredClone({ ...program, version: "desert.view-program/4", workspace: workspace.id,
    views: [...program.views.filter(view => ![workspace.id, navigation.id].includes(view.id)), workspace, navigation] });
}

test("A workspace explicitly places shared navigation beside its destination outlet", () => {
  const result = compileViewProgram(candidate(), surface);
  assert.equal(result.workspace, "workspace");
  assert.deepEqual(result.views.find(view => view.id === result.workspace)?.leftDock,
    { kind: "view", view: "workspace-navigation" });
  assert.deepEqual(result.navigation, program.navigation);
  assert.equal(resolveProgramWorkspace(result).navigation?.title, "Notebook");
});

test("An authored navigation title is used rather than the product label", () => {
  const source = candidate();
  const alternate = { ...navigation, content: [{ ...navigation.content[0], title: "Workspace navigation" }, { kind: "navigation" }] };
  const result = compileViewProgram({ ...source, views: source.views.map(view => view.id === navigation.id ? alternate : view) }, surface);
  assert.equal(resolveProgramWorkspace(result).navigation?.title, "Workspace navigation");
});

test("An outlet-only workspace does not infer a navigation surface from navigation entries", () => {
  const source = candidate();
  const { leftDock, ...outletOnly } = workspace;
  void leftDock;
  const result = compileViewProgram({ ...source, views: source.views.filter(view => view.id !== navigation.id)
    .map(view => view.id === workspace.id ? outletOnly : view) }, surface);
  assert.equal(resolveProgramWorkspace(result).navigation, undefined);
  assert.deepEqual(result.navigation, program.navigation);
});

test("Product workspace references are registered objects, never string identifiers", () => {
  const source = authoredNotebookSource();
  const result = composeProduct(source);
  assert.equal(result.viewProgram.workspace, source.workspace.id);
  assert.throws(() => composeProduct({ ...source, workspace: source.workspace.id } as never), /STRING_MODULE_REFERENCE_FORBIDDEN/);
  assert.throws(() => composeProduct({ ...source, workspace: { ...source.workspace } } as never), /UNREGISTERED_LOCAL_REFERENCE/);
});

test("No implicit workspace is fabricated for a missing declaration or older protocol", () => {
  const missing = candidate();
  Reflect.deleteProperty(missing, "workspace");
  assert.throws(() => compileViewProgram(missing, surface), /INVALID_VIEW_PROGRAM/);
  assert.throws(() => compileViewProgram({ ...candidate(), version: "desert.view-program/2" }, surface), /INVALID_VIEW_PROGRAM/);
  assert.throws(() => compileViewProgram({ ...candidate(), workspace: "home" }, surface), /INVALID_WORKSPACE_VIEW/);
});

test("Workspace roles reject unsupported or ignored declarations", () => {
  const change = (id: string, values: object) => {
    const source = candidate();
    return { ...source, views: source.views.map(view => view.id === id ? { ...view, ...values } : view) };
  };
  for (const values of [
    { topDock: { kind: "toolbar", actions: [] } },
    { bottomDock: { kind: "toolbar", actions: [] } },
    { outputs: [] },
    { rightDock: { kind: "view", view: "home" } },
  ]) assert.throws(() => compileViewProgram(change("workspace", values), surface), /INVALID_WORKSPACE_VIEW/);
  for (const values of [
    { topDock: { kind: "toolbar", actions: [] } },
    { bottomDock: { kind: "toolbar", actions: [] } },
    { outputs: [] },
    { leftDock: { kind: "view", view: "home" } },
  ]) assert.throws(() => compileViewProgram(change("workspace-navigation", values), surface), /INVALID_NAVIGATION_VIEW/);
  assert.throws(() => compileViewProgram(change("home", { content: [{ kind: "navigation" }] }), surface), /WORKSPACE_CONTENT_OUTSIDE_WORKSPACE/);
  assert.throws(() => compileViewProgram(change("home", { content: [{ kind: "header", id: "product-title", title: { kind: "product-title" } }] }), surface), /WORKSPACE_CONTENT_OUTSIDE_WORKSPACE/);
  assert.throws(() => compileViewProgram(change("home", { leftDock: { kind: "view", view: "workspace-navigation" } }), surface), /UNSUPPORTED_PROGRAM_SIDE_DOCK/);
});

test("Workspace nodes and navigation entries reject undeclared properties at the schema boundary", () => {
  for (const node of [
    { kind: "navigation", items: [] },
    { kind: "navigation", title: "Ignored title" },
  ]) {
    const source = candidate();
    const views = source.views.map(view => view.id === navigation.id
      ? { ...view, content: [navigation.content[0], node] } : view);
    assert.throws(() => compileViewProgram({ ...source, views }, surface), /INVALID_VIEW_PROGRAM/);
  }
  for (const node of [
    { kind: "destination", view: "home" },
    { kind: "destination", content: [] },
  ]) {
    const source = candidate();
    const views = source.views.map(view => view.id === workspace.id ? { ...view, content: [node] } : view);
    assert.throws(() => compileViewProgram({ ...source, views }, surface), /INVALID_VIEW_PROGRAM/);
  }
  const source = candidate();
  const entries = source.navigation.map(entry => ({ ...entry, items: [] }));
  assert.throws(() => compileViewProgram({ ...source, navigation: entries }, surface), /INVALID_VIEW_PROGRAM/);
});

test("A destination cannot navigate to workspace or navigation composition", () => {
  const source = candidate();
  const journeys = source.journeys.map(journey => journey.id === "home" ? { ...journey, view: "workspace-navigation" } : journey);
  assert.throws(() => compileViewProgram({ ...source, journeys }, surface), /WORKSPACE_VIEW_AS_DESTINATION/);
});
