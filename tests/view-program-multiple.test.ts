import assert from "node:assert/strict";
import test from "node:test";
import { compileViewProgram } from "../src/views/program.ts";
import { buildHumanModule } from "../src/web/build.ts";
import { multiProgram, multiSurface } from "./fixtures/multi-view-program.ts";
import { compile } from "../src/compile.ts";
import { mutationJourney, updateCommand, fromInput, controllerRole, compile as compileProduct } from "../src/index.ts";
import { AuthoredMultiProduct } from "./fixtures/authored-multi-product.ts";
import { Card, MultiNotebook } from "./fixtures/multi-view-program.ts";
import { Note } from "../products/notebook/note.ts";

test("canonical exposure publishes operations for multiple objects without a default entry object", () => {
  const role = controllerRole({ id: "notes", objects: [Note, Card], requires: [] });
  const edit = mutationJourney("edit-card", updateCommand("edit-card-record", Card, {
    input: ["body"], when: {}, set: { body: fromInput("body") },
  }), { controller: role, dependencies: [] });
  const definition = { ...MultiNotebook, journeys: [...MultiNotebook.journeys, edit],
    surfaces: MultiNotebook.surfaces.map(surface => surface.kind !== "human" ? surface : { ...surface,
      journeys: [...surface.journeys, edit.id],
      commit: { ...surface.commit, [edit.id]: "submit" as const },
      language: { ...surface.language, journeys: { ...surface.language.journeys, [edit.id]: "Edit card" } },
    }),
  };
  assert.equal(compile(definition).surface("human").journeys.find(item => item.id === edit.id)?.kind, "mutation");
});

test("multiple reads for one object require an explicit creation result source", () => {
  const canonical = multiSurface.journeys.find(item => item.id === "read-note")!;
  const surface = { ...multiSurface, journeys: [...multiSurface.journeys, { ...canonical, id: "read-notes-again" }] };
  const original = multiProgram.journeys.find(item => item.kind === "read" && item.id === "read-note")!;
  const candidate = { ...multiProgram, journeys: [...multiProgram.journeys, { ...original, id: "read-notes-again" }],
    destinations: [...multiProgram.destinations, { id: "again", label: "Again", icon: "open", entryJourney: "read-notes-again" }],
    navigation: [...multiProgram.navigation, { destination: "again", group: "Explore", purpose: "content" as const }],
  };
  assert.doesNotThrow(() => compileViewProgram(candidate, surface));
  const omitted = structuredClone(candidate) as Record<string, any>;
  delete omitted.journeys.find((journey: any) => journey.id === "create-note").source;
  assert.throws(() => compileViewProgram(omitted, surface), /INVALID_VIEW_PROGRAM/);
  const compiled = compileViewProgram({ ...candidate, journeys: candidate.journeys.map(journey =>
    journey.id === "create-note" ? { ...journey, source: "read-notes-again" } : journey) }, surface);
  const creation = compiled.journeys.find(journey => journey.id === "create-note");
  assert.equal(creation?.kind === "create" ? creation.source : undefined, "read-notes-again");
  assert.throws(() => compileViewProgram({ ...candidate, journeys: candidate.journeys.map(journey =>
    journey.id === "create-note" ? { ...journey, source: "read-cards" } : journey) }, surface), /INVALID_VIEW_SOURCE/);
});

test("two objects expose independent reads, creations and an explicitly initialized subject editor", async () => {
  const application = compileProduct(AuthoredMultiProduct);
  const compiled = compileViewProgram(AuthoredMultiProduct.viewProgram, application.surface("human"));
  assert.equal(compiled.journeys.filter(journey => journey.kind === "read").length, 2);
  assert.equal(compiled.journeys.filter(journey => journey.kind === "create").length, 2);
  const editor = compiled.journeys.find(journey => journey.kind === "update");
  assert.ok(editor?.kind === "update");
  assert.equal(editor.source, "read-note");
  assert.deepEqual(editor.initialize, [{ input: "title", fact: "title" }, { input: "body", fact: "body" }]);
  assert.match(await buildHumanModule(application, "human"), /create-card/);
});

test("subject initialization cannot read a hidden fact or bind another object's source", () => {
  for (const mutation of [
    (value: any) => { value.journeys.at(-1).initialize[0].fact = "owner"; },
    (value: any) => { value.journeys.at(-1).source = "read-cards"; },
    (value: any) => { value.journeys.at(-1).initialize.pop(); },
    (value: any) => { value.objects[0].title.field = "owner"; },
  ]) {
    const candidate = structuredClone(multiProgram); mutation(candidate);
    assert.throws(() => compileViewProgram(candidate, multiSurface), /INVALID_VIEW_(INITIALIZATION|SOURCE|OBJECT_PRESENTATION)/);
  }
});
