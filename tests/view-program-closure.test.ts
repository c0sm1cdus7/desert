import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import type { HumanSurface } from "../src/web/types.ts";
import { compileViewProgram } from "../src/views/program.ts";
import { ViewProgramSchema, ViewJourneySchema, ViewDestinationSchema } from "../src/views/program-schema.ts";
import { ActionIconSchema } from "../src/interaction/toolbar.ts";
import { program, surface } from "./fixtures/view-program.ts";

const candidate = () => structuredClone(program) as unknown as Record<string, any>;
const reject = (value: unknown, message: string) =>
  assert.throws(() => compileViewProgram(value, surface), { message });

test("Navigation, destinations and bindings cannot strand authored experience", () => {
  const editorDestination = candidate(); editorDestination.destinations[0].entryJourney = program.journeys[2].id;
  reject(editorDestination, "INVALID_DESTINATION_JOURNEY");
  assert.doesNotThrow(() => compileViewProgram({ ...program, navigation: program.navigation.slice(1) }, surface));
  reject({ ...program, navigation: program.navigation.slice(0, 2) }, "UNREACHABLE_PROGRAM_JOURNEY");
  const unusedView = candidate(); unusedView.views.push({ version: "desert.view/1", id: "unused", content: [] });
  reject(unusedView, "UNUSED_PROGRAM_VIEW");
  const unreachable = candidate(); unreachable.journeys[1].outputs[0].action.journey = "catalog";
  reject(unreachable, "UNREACHABLE_PROGRAM_JOURNEY");
  const silentOutput = candidate(); silentOutput.views[0].outputs.push("silent");
  silentOutput.journeys[0].outputs.push({ view: "home", output: "silent", action: { kind: "journey", journey: "catalog" } });
  reject(silentOutput, "UNREACHABLE_VIEW_OUTPUT");
});

test("Executable program requires referenced journeys and unambiguous destinations", () => {
  const incomplete = candidate(); incomplete.journeys.splice(2, 1);
  reject(incomplete, "UNKNOWN_OUTPUT_JOURNEY");
  const orphan = candidate(); orphan.journeys.push({ id: "orphan", kind: "presentation", view: "catalog", outputs: [] });
  reject(orphan, "INVALID_JOURNEY_DESTINATION_COUNT");
  const ambiguous = candidate(); ambiguous.destinations.push({ ...ambiguous.destinations[1], id: "other-notes" });
  reject(ambiguous, "INVALID_JOURNEY_DESTINATION_COUNT");
});

test("Shared header media is admitted while catalog duplication fails instead of being silently dropped", () => {
  const media = candidate(); media.views[2].content[0].media = { kind: "image", asset: "cover", alt: "Cover" };
  assert.doesNotThrow(() => compileViewProgram(media, surface));
  const mainMedia = candidate(); mainMedia.views[0].content[0].media = { kind: "image", asset: "cover", alt: "Cover" };
  assert.doesNotThrow(() => compileViewProgram(mainMedia, surface));
  const duplicate = candidate(); duplicate.views[4].content.push({ kind: "visual-catalog", id: "second" });
  reject(duplicate, "INVALID_JOURNEY_CATALOG_CONTENT");
  const readCatalog = candidate(); readCatalog.views[1].content.push({ kind: "visual-catalog", id: "inspection" });
  reject(readCatalog, "INVALID_JOURNEY_CATALOG_CONTENT");
});

test("Executable toolbar slots cannot drop actions, move close or erase an output payload", () => {
  const bottom = candidate(); bottom.views[3].bottomDock.actions.push(bottom.views[3].bottomDock.actions[0]);
  reject(bottom, "UNSUPPORTED_PROGRAM_BOTTOM_TOOLBAR");
  const misplacedClose = candidate(); misplacedClose.views[3].bottomDock.actions = misplacedClose.views[3].topDock.actions;
  misplacedClose.views[3].topDock.actions = [{ output: "save", label: "Save", icon: "save" }];
  reject(misplacedClose, "UNSUPPORTED_PROGRAM_BOTTOM_TOOLBAR");
  const trailingClose = candidate(); trailingClose.views[3].topDock.actions.unshift({ output: "save", label: "Save", icon: "save" });
  reject(trailingClose, "INVALID_PANEL_CLOSE_ACTION");
  const payload = candidate(); payload.views[1].topDock.actions.push({ output: "select", label: "Select", icon: "open" });
  reject(payload, "CONFLICTING_VIEW_OUTPUT_PORT");
});

test("Dismissal availability belongs to runtime state, never an authored disabled close override", () => {
  for (const index of [2, 3]) {
    const enabled = candidate(); enabled.views[index].topDock.actions[0].disabled = false;
    assert.doesNotThrow(() => compileViewProgram(enabled, surface));
    const disabled = candidate(); disabled.views[index].topDock.actions[0].disabled = true;
    reject(disabled, "AUTHORED_CLOSE_DISABLED");
  }
});

test("Executable identity cannot be silently lifted from a later content position", () => {
  const lateHeader = candidate(); lateHeader.views[0].content.unshift({ kind: "text", text: "Before identity" });
  reject(lateHeader, "INVALID_PROGRAM_HEADER_PLACEMENT");
  assert.doesNotThrow(() => compileViewProgram(program, surface));
});

test("One output cannot acquire contradictory toolbar states through repeated placement", () => {
  const repeated = candidate(); repeated.views[3].topDock.actions.push({ output: "save", label: "Save", icon: "save" });
  repeated.views[3].bottomDock.actions[0].disabled = true;
  reject(repeated, "DUPLICATE_TOOLBAR_OUTPUT");
  const sameState = candidate(); sameState.views[1].bottomDock = { kind: "toolbar", actions: [sameState.views[1].topDock.actions[0]] };
  reject(sameState, "DUPLICATE_TOOLBAR_OUTPUT");
});

test("Program validates human exposure and keeps review policy in the canonical surface", () => {
  const agent = compile(Notebook).surface("agent");
  assert.throws(() => compileViewProgram(program, agent as HumanSurface), { message: "INVALID_VIEW_PROGRAM_SURFACE" });
  const reviewed = { ...surface, commit: { ...surface.commit, [program.journeys[2].id]: "review" as const } };
  assert.deepEqual(compileViewProgram(program, reviewed), program);
  assert.equal(reviewed.commit[program.journeys[2].id], "review");
  const create = surface.journeys.find(item => item.id === program.journeys[2].id)!;
  const mismatched = { ...surface, journeys: surface.journeys.map(item => item === create ? { ...item, object: "other" } : item) };
  assert.throws(() => compileViewProgram(program, mismatched), { message: "INVALID_VIEW_SOURCE" });
});

test("Program schemas are sealed clones and caller property access is never executed", () => {
  for (const schema of [ViewProgramSchema, ViewJourneySchema, ViewDestinationSchema]) assert.ok(Object.isFrozen(schema));
  assert.equal(Object.isFrozen(ActionIconSchema), false);
  assert.notEqual(ViewDestinationSchema.properties.icon, ActionIconSchema);
  assert.equal(Reflect.set(ViewProgramSchema, "additionalProperties", true), false);
  let reads = 0;
  const accessor = { ...program };
  Object.defineProperty(accessor, "journeys", { enumerable: true, get() { reads++; return program.journeys; } });
  reject(accessor, "INVALID_VIEW_JSON");
  assert.equal(reads, 0);
});
