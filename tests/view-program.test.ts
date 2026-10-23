import test from "node:test";
import assert from "node:assert/strict";
import { compileViewProgram } from "../src/views/program.ts";
import { program, surface } from "./fixtures/view-program.ts";
import { ArchiveNote, CreateNote, ReadNote } from "../products/notebook/journeys.ts";

const candidate = () => structuredClone(program) as unknown as Record<string, any>;
const reject = (value: unknown, message: string) =>
  assert.throws(() => compileViewProgram(value, surface), { message });

test("A presentation program binds canonical reads and create inputs without copying their schemas", () => {
  const result = compileViewProgram(program, surface);
  assert.deepEqual(result, program);
  assert.equal(result.journeys[1]?.id, ReadNote.id);
  assert.equal(result.journeys[2]?.id, CreateNote.id);
  assert.deepEqual(result.navigation, program.navigation);
  for (const value of [result, result.views, result.views[1]?.content, result.journeys,
    result.journeys[1]?.outputs, result.destinations, result.navigation]) assert.ok(Object.isFrozen(value));
  const source = candidate();
  const snapshot = compileViewProgram(source, surface);
  source.views[0].content[0].title = "Replaced";
  assert.equal(snapshot.views[0]?.content[0]?.kind, "header");
  assert.notDeepEqual(snapshot.views, source.views);
});

test("Closed authoring rejects schema, style, controller and callback escape hatches", () => {
  for (const extra of [{ class: "custom" }, { controller: "notes" }, { inputSchema: {} },
    { commands: ["create-note"] }, { runtime: "custom" }]) {
    reject({ ...program, ...extra }, "INVALID_VIEW_PROGRAM");
    const value = candidate(); value.journeys[2] = { ...value.journeys[2], ...extra };
    reject(value, "INVALID_VIEW_PROGRAM");
  }
  reject({ ...program, version: "desert.view-program/99" }, "INVALID_VIEW_PROGRAM");
  reject({ ...program, label: " " }, "INVALID_VIEW_PROGRAM");
  reject({ ...program, callback() {} }, "INVALID_VIEW_JSON");
  reject({ ...program, productId: "another-product" }, "VIEW_PROGRAM_PRODUCT_MISMATCH");
});

test("Every reference is exact and duplicate registrations fail before mounting", () => {
  for (const [property, error] of [["journeys", "DUPLICATE_VIEW_JOURNEY"],
    ["destinations", "DUPLICATE_VIEW_DESTINATION"], ["views", "DUPLICATE_VIEW_ID"]] as const) {
    const value = candidate(); value[property].push(value[property][0]); reject(value, error);
  }
  const missingView = candidate(); missingView.journeys[1].detailView = "missing";
  reject(missingView, "UNKNOWN_PROGRAM_VIEW");
  const missingJourney = candidate(); missingJourney.destinations[0].entryJourney = "missing";
  reject(missingJourney, "UNKNOWN_DESTINATION_JOURNEY");
  const missingOutputJourney = candidate(); missingOutputJourney.journeys[0].outputs[0].action.journey = "missing";
  reject(missingOutputJourney, "UNKNOWN_OUTPUT_JOURNEY");
  reject({ ...program, entry: "missing" }, "UNKNOWN_ENTRY_DESTINATION");
  reject({ ...program, navigation: [program.navigation[0], { ...program.navigation[0], destination: "missing" }] }, "UNKNOWN_NAVIGATION_DESTINATION");
  reject({ ...program, navigation: [program.navigation[0], program.navigation[0]] }, "DUPLICATE_NAVIGATION_DESTINATION");
});

test("Bindings cannot invent exposure, replace read with mutation or turn update into create", () => {
  const unexposed = candidate(); unexposed.journeys[1].id = "private-read";
  reject(unexposed, "UNEXPOSED_VIEW_JOURNEY");
  const wrongRead = candidate(); wrongRead.journeys[1].id = CreateNote.id; wrongRead.journeys.splice(2, 1);
  reject(wrongRead, "VIEW_JOURNEY_KIND_MISMATCH");
  const update = candidate(); update.journeys[2].id = ArchiveNote.id;
  reject(update, "VIEW_JOURNEY_KIND_MISMATCH");
  const collision = candidate(); collision.journeys[0].id = ArchiveNote.id;
  reject(collision, "PRESENTATION_JOURNEY_COLLISION");
});

test("Data slots enforce cardinality and kind across loose content and stacks", () => {
  const missing = candidate(); missing.views[1].content.pop(); reject(missing, "INVALID_JOURNEY_VIEW_INPUTS");
  const duplicate = candidate(); duplicate.views[1].content.push({ kind: "collection", id: "other", input: "other", output: "select" });
  reject(duplicate, "INVALID_JOURNEY_VIEW_INPUTS");
  const wrong = candidate(); wrong.views[3].content[1] = { kind: "context", id: "context", input: "detail" };
  reject(wrong, "INVALID_JOURNEY_VIEW_INPUTS");
  const panelStack = candidate(); panelStack.views[3].content[1] = { kind: "stack", id: "wrapped", title: "Write", items: [panelStack.views[3].content[1]] };
  assert.doesNotThrow(() => compileViewProgram(panelStack, surface));
  const extra = candidate(); extra.views[2].content.push({ kind: "text", text: "Not mounted by a panel." });
  assert.doesNotThrow(() => compileViewProgram(extra, surface));
  const dock = candidate(); dock.views[0].rightDock = { kind: "view", view: "catalog" };
  reject(dock, "UNSUPPORTED_PROGRAM_SIDE_DOCK");
  const unsafePresentation = candidate(); unsafePresentation.views[4].content.push({ kind: "form", id: "write", input: "draft" });
  reject(unsafePresentation, "INVALID_JOURNEY_VIEW_INPUTS");
});

test("Every declared output binds exactly once to an available semantic action", () => {
  const missing = candidate(); missing.journeys[1].outputs.pop(); reject(missing, "UNBOUND_VIEW_OUTPUT");
  const duplicate = candidate(); duplicate.journeys[1].outputs.push(duplicate.journeys[1].outputs[0]);
  reject(duplicate, "DUPLICATE_VIEW_OUTPUT_BINDING");
  const unknown = candidate(); unknown.journeys[0].outputs[0].output = "unknown";
  reject(unknown, "UNKNOWN_BOUND_VIEW_OUTPUT");
  const otherView = candidate(); otherView.journeys[0].outputs[0].view = "editor";
  reject(otherView, "FOREIGN_OUTPUT_VIEW");
  const select = candidate(); select.journeys[1].outputs[1].action = { kind: "journey", journey: CreateNote.id };
  reject(select, "INVALID_COLLECTION_OUTPUT_ACTION");
  const submit = candidate(); submit.journeys[0].outputs[0].action = { kind: "submit" };
  reject(submit, "INVALID_DESTINATION_LINK_ACTION");
  const absentSubmit = candidate(); absentSubmit.journeys[2].outputs[0].action = { kind: "close" };
  reject(absentSubmit, "INVALID_CREATE_OUTPUTS");
});
