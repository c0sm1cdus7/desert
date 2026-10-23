import assert from "node:assert/strict";
import test from "node:test";
import { compileViewProgram } from "../src/views/program.ts";
import { viewScopes } from "../src/web/client/view-scopes.ts";
import { projectView } from "../src/web/client/view-projection.ts";
import { program, surface } from "./fixtures/view-program.ts";
import type { ViewProgram } from "../src/views/program-schema.ts";
import { runtimeFixture } from "./fixtures/view-program-runtime.ts";
import { viewProgramModel } from "../src/web/client/view-program.ts";
import { multiProgram, multiSurface } from "./fixtures/multi-view-program.ts";

function collection(candidate: ViewProgram, supplied = surface) {
  const compiled = compileViewProgram(candidate, supplied);
  const scope = viewScopes(compiled, supplied, () => true).find(item => item.scope.kind === "read" && item.scope.read.id === "read-note")!;
  const read = compiled.journeys.find(item => item.id === "read-note")!;
  assert.equal(read.kind, "read");
  if (read.kind !== "read") throw new Error("Expected read binding");
  const view = compiled.views.find(item => item.id === read.view)!;
  const resolved = projectView(compiled, read, view, scope.surface, scope.model.snapshot(), () => true, scope.scope);
  scope.model.stop();
  return { scope, node: resolved.bindings.records };
}

test("a read-only collection does not require or invent a creation instruction", () => {
  const candidate: ViewProgram = { ...program,
    views: program.views.filter(view => view.id !== "editor").map(view => view.id !== "notes" ? view : {
      ...view, outputs: ["select"], topDock: { kind: "toolbar", actions: [] },
    }),
    journeys: program.journeys.filter(journey => journey.kind !== "create").map(journey => journey.kind !== "read" ? journey : {
      ...journey, outputs: journey.outputs.filter(output => output.output !== "create"),
    }),
  };
  const result = collection(candidate);
  assert.equal(result.scope.surface, surface, "canonical surface identity must remain intact");
  assert.equal(result.scope.scope.kind, "read");
  assert.equal(Object.hasOwn(result.scope.scope, "primaryCreation"), false);
  assert.equal(result.scope.model.snapshot().creationJourneyId, null);
  assert.equal(Object.hasOwn(result.node!, "createLabel"), false);
});

test("multiple creation journeys do not silently nominate the first as the collection primary", () => {
  const canonical = surface.journeys.find(journey => journey.id === "create-note")!;
  const supplied = { ...surface, journeys: [...surface.journeys, { ...canonical, id: "create-another" }],
    language: { ...surface.language, journeys: { ...surface.language.journeys, "create-another": "Create another note" } },
  };
  const original = program.journeys.find(journey => journey.kind === "create")!;
  const candidate: ViewProgram = { ...program,
    views: program.views.map(view => view.id !== "notes" ? view : { ...view, outputs: [...view.outputs, "another"],
      topDock: { kind: "toolbar", actions: [...view.topDock.actions, { output: "another", label: "Another", icon: "create" }] },
    }),
    journeys: [...program.journeys.map(journey => journey.kind !== "read" ? journey : { ...journey,
      outputs: [...journey.outputs, { view: "notes", output: "another", action: { kind: "journey" as const, journey: "create-another" } }],
    }), { ...original, id: "create-another" }],
  };
  const result = collection(candidate, supplied);
  assert.equal(result.scope.surface, supplied, "canonical surface identity must remain intact");
  assert.equal(result.scope.scope.kind, "read");
  assert.equal(Object.hasOwn(result.scope.scope, "primaryCreation"), false);
  assert.equal(result.scope.model.snapshot().creationJourneyId, null);
  assert.equal(Object.hasOwn(result.node!, "createLabel"), false);
});

test("a presentation-only program has no invented read or creation and performs only availability observation", async t => {
  const candidate: ViewProgram = { ...program, entry: "catalog", navigation: [program.navigation[2]],
    views: program.views.filter(view => ["catalog", "workspace", "workspace-navigation"].includes(view.id)),
    journeys: program.journeys.filter(journey => journey.id === "catalog"),
    destinations: program.destinations.filter(destination => destination.id === "catalog"),
  };
  const scopes = viewScopes(compileViewProgram(candidate, surface), surface, () => true);
  assert.equal(scopes.length, 1);
  assert.equal(scopes[0]!.surface, surface);
  assert.deepEqual(scopes[0]!.scope, { kind: "presentation" });
  assert.equal(scopes[0]!.model.snapshot().creationJourneyId, null);
  scopes[0]!.model.create("create-note");
  assert.equal(scopes[0]!.model.snapshot().view, "list");
  scopes[0]!.model.stop();
  const { model, calls } = await runtimeFixture(t, { definition: candidate });
  model.navigate("catalog");
  assert.equal(model.snapshot().state.creationJourneyId, null);
  assert.deepEqual(calls.map(call => call.method), ["availability"]);
});

test("the initial snapshot uses the declared entry read, not the first registered read", () => {
  const model = viewProgramModel({ ...multiProgram, entry: "cards" }, multiSurface, () => true);
  const snapshot = model.snapshot();
  assert.equal(snapshot.activeDestination, "cards");
  const records = snapshot.resolved.bindings.records;
  assert.equal(records?.kind, "collection");
  if (records?.kind === "collection") assert.equal(records.object, "card");
  model.stop();
});
