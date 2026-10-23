import test from "node:test";
import assert from "node:assert/strict";
import { compileViewProgram } from "../src/views/program.ts";
import { publishedActionsFor } from "../src/views/program-bindings.ts";
import { actionProgram, surface, ArchiveNote, ReadNote } from "./fixtures/view-subject-actions.ts";
import { multiProgram, multiSurface } from "./fixtures/multi-view-program.ts";
import { EditNote } from "./fixtures/editing-notebook.ts";

const candidate = () => structuredClone(actionProgram) as unknown as Record<string, any>;
test("A published input-free subject action binds the canonical update without inventing a form or destination", () => {
  const compiled = compileViewProgram(actionProgram, surface);
  assert.deepEqual(compiled, actionProgram);
  assert.equal(compiled.views.length, actionProgram.views.length);
  const read = compiled.journeys.find(item => item.id === ReadNote.id)!;
  assert.deepEqual(publishedActionsFor(compiled, read), [
    { object: "note", view: "detail", journey: ArchiveNote.id, icon: "archive" },
  ]);
});

test("Action bindings require input-free canonical updates, exact source and object publication", () => {
  const inputBearing = structuredClone(multiProgram) as unknown as Record<string, any>;
  inputBearing.journeys = inputBearing.journeys.map((item: any) => item.id !== EditNote.id ? item :
    { id: EditNote.id, kind: "action", source: ReadNote.id, outputs: [] });
  inputBearing.views = inputBearing.views.filter((item: any) => item.id !== "edit-note");
  assert.throws(() => compileViewProgram(inputBearing, multiSurface), /INVALID_VIEW_ACTION_INPUTS/);
  const foreign = candidate(); foreign.journeys.at(-1).source = "home";
  assert.throws(() => compileViewProgram(foreign, surface), /INVALID_VIEW_SOURCE/);
  const unpublished = candidate(); unpublished.objects[0].actions = [];
  assert.throws(() => compileViewProgram(unpublished, surface), /UNPUBLISHED_VIEW_SUBJECT_ACTION/);
  const escape = candidate(); escape.journeys.at(-1).view = "editor";
  assert.throws(() => compileViewProgram(escape, surface), /INVALID_VIEW_PROGRAM/);
  const destination = candidate(); destination.destinations[0].entryJourney = ArchiveNote.id;
  assert.throws(() => compileViewProgram(destination, surface), /INVALID_DESTINATION_JOURNEY/);
});

test("Navigation outputs cannot manufacture a selected subject for update or input-free action", () => {
  for (const [original, exposed, target] of [[multiProgram, multiSurface, EditNote.id],
    [actionProgram, surface, ArchiveNote.id]] as const) {
    for (const owner of ["home", ReadNote.id]) {
      const value = structuredClone(original) as unknown as Record<string, any>;
      const journey = value.journeys.find((item: any) => item.id === owner);
      journey.outputs[0].action = { kind: "journey", journey: target };
      assert.throws(() => compileViewProgram(value, exposed), owner === "home"
        ? /INVALID_DESTINATION_LINK_ACTION/ : /INVALID_VIEW_SUBJECT_EDGE/);
    }
  }
});
