import assert from "node:assert/strict";
import test from "node:test";
import { view } from "../src/views/view.ts";
import { compileViewProgram } from "../src/views/program.ts";
import { program, surface } from "./fixtures/view-program.ts";
import { multiProgram, multiSurface } from "./fixtures/multi-view-program.ts";

function declared() {
  const candidate: any = structuredClone(program);
  candidate.objects = [{ object: "note", view: "detail", title: { object: "note", field: "title" }, actions: [] }];
  candidate.views[2].content[0].title = { kind: "subject-title" };
  candidate.views[3].content[0].title = { kind: "operation-label" };
  return candidate;
}

test("semantic header titles are explicit closed declarations, not executable bindings", () => {
  for (const title of ["Explicit literal", { kind: "subject-title" }, { kind: "operation-label" }]) {
    const candidate = { ...program.views[2], content: [{ ...program.views[2].content[0], title }, program.views[2].content[1]] };
    assert.deepEqual(view(candidate).content[0], candidate.content[0]);
  }
  for (const title of [{ kind: "expression", value: "detail.title" }, { kind: "subject-title", field: "owner" },
    { kind: "operation-label", style: "large" }, () => "title"]) {
    assert.throws(() => view({ ...program.views[2], content: [{ ...program.views[2].content[0], title }] }));
  }
});

test("published detail and operation views admit only their explicitly declared title source", () => {
  const candidate = declared();
  const result = compileViewProgram(candidate, surface);
  assert.deepEqual(result.views[2]!.content[0], candidate.views[2].content[0]);
  assert.deepEqual(result.views[3]!.content[0], candidate.views[3].content[0]);
  const literal = declared(); literal.views[2].content[0].title = "Explicit literal";
  assert.equal((compileViewProgram(literal, surface).views[2]!.content[0] as any).title, "Explicit literal");
});

test("semantic title sources cannot escape their authorized detail or operation context", () => {
  for (const [index, kind] of [[0, "subject-title"], [1, "subject-title"], [3, "subject-title"],
    [0, "operation-label"], [1, "operation-label"], [2, "operation-label"]] as const) {
    const candidate = declared(); candidate.views[index].content[0].title = { kind };
    assert.throws(() => compileViewProgram(candidate, surface), { message: "INVALID_VIEW_HEADER_BINDING" });
  }
  const unpublished = declared(); delete unpublished.objects;
  assert.throws(() => compileViewProgram(unpublished, surface), { message: "INVALID_VIEW_HEADER_BINDING" });
  const privateTitle = declared(); privateTitle.objects[0].title.field = "owner";
  assert.throws(() => compileViewProgram(privateTitle, surface), { message: "INVALID_VIEW_OBJECT_PRESENTATION" });
});

test("published action metadata is closed, explicit and unique by journey", () => {
  for (const actions of [[{ journey: "edit-note" }], [{ journey: "edit-note", icon: "invented" }],
    [{ journey: "edit-note", icon: "edit", style: "custom" }]]) {
    const candidate = declared(); candidate.objects[0].actions = actions;
    assert.throws(() => compileViewProgram(candidate, surface), { message: "INVALID_VIEW_PROGRAM" });
  }
  const legacy = declared(); legacy.objects[0].journeys = []; delete legacy.objects[0].actions;
  assert.throws(() => compileViewProgram(legacy, surface), { message: "INVALID_VIEW_PROGRAM" });
  const duplicate: any = structuredClone(multiProgram);
  duplicate.objects[0].actions.push({ ...duplicate.objects[0].actions[0], icon: "archive" });
  assert.throws(() => compileViewProgram(duplicate, multiSurface), { message: "INVALID_VIEW_OBJECT_PRESENTATION" });
});
