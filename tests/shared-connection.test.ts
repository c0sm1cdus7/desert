import test from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { viewProgramModel } from "../src/web/client/view-program.ts";
import { viewScopes } from "../src/web/client/view-scopes.ts";
import type { ControllerTransport } from "../src/web/client/transport.ts";
import type { Evidence, HumanSurface } from "../src/web/types.ts";
import type { ViewProgram } from "../src/views/program-schema.ts";
import { program, surface } from "./fixtures/view-program.ts";

const read = surface.journeys.find(journey => journey.kind === "read")!;
const binding = program.journeys.find(journey => journey.kind === "read")!;
const extras = [1, 2, 3, 4].map(index => ({ ...read, id: `read-extra-${index}` }));
const exposed: HumanSurface = { ...surface, journeys: [...surface.journeys, ...extras],
  language: { ...surface.language, journeys: { ...surface.language.journeys,
    ...Object.fromEntries(extras.map(journey => [journey.id, journey.id])) } } };
const definition: ViewProgram = { ...program, journeys: [...program.journeys,
  ...extras.map(journey => ({ ...binding, id: journey.id }))],
  destinations: [...program.destinations, ...extras.map(journey => ({
    id: journey.id, entryJourney: journey.id, label: journey.id, icon: "open" as const,
  }))], navigation: [...program.navigation, ...extras.map(journey => ({
    destination: journey.id, group: "Explore", purpose: "content" as const,
  }))] };
const ready: Evidence = { snapshot: { contractDigest: exposed.contractDigest,
  journeys: Object.fromEntries(exposed.journeys.map(journey => [journey.id, { dependenciesReady: true, blockers: [] }])) }, validForMs: 5000 };

function controlledTransport() {
  const requests: { resolve(value: Evidence): void }[] = [];
  const transport: ControllerTransport = {
    evidence() { return new Promise(resolve => { requests.push({ resolve }); }); },
    async call(method) {
      if (method === "begin") return { id: "read-run" } as never;
      if (method === "read") return [] as never;
      throw new Error(`UNEXPECTED_OPERATION: ${method}`);
    },
  };
  return { transport, requests };
}

test("six view scopes share one availability request and one subsequent observation loop", async t => {
  const f = controlledTransport(), model = viewProgramModel(definition, exposed, () => true, f.transport);
  t.after(() => model.stop());
  await model.start();
  assert.equal(f.requests.length, 1, "five read scopes and one presentation scope must not multiply connection polling");
  f.requests[0]!.resolve(ready); await delay(0);
  for (const destination of definition.destinations) {
    model.navigate(destination.id);
    assert.ok(Object.values(model.snapshot().state.availability.journeys).every(journey => journey.dependenciesReady));
  }
  await delay(300);
  assert.equal(f.requests.length, 2);
  model.stop();
  f.requests[1]!.resolve(ready); await delay(300);
  assert.equal(f.requests.length, 2, "a late response after unmount must not revive polling");
});

test("all scopes lose readiness when one shared evidence deadline expires", async t => {
  const f = controlledTransport(), model = viewProgramModel(definition, exposed, () => true, f.transport);
  t.after(() => model.stop()); await model.start();
  assert.equal(f.requests.length, 1);
  f.requests[0]!.resolve({ ...ready, validForMs: 40 }); await delay(0);
  assert.ok(Object.values(model.snapshot().state.availability.journeys).every(journey => journey.dependenciesReady));
  await delay(70);
  for (const destination of definition.destinations) {
    model.navigate(destination.id);
    assert.ok(Object.values(model.snapshot().state.availability.journeys).every(journey =>
      !journey.dependenciesReady && journey.blockers.every(blocker => blocker.reason === "stale")));
  }
  assert.equal(f.requests.length, 1, "expiry is not a second polling owner");
});

test("a stopped program's delayed evidence cannot make a new program or identity ready", async t => {
  const f = controlledTransport(), first = viewProgramModel(definition, exposed, () => true, f.transport);
  t.after(() => first.stop());
  await first.start(); assert.equal(f.requests.length, 1); first.stop();
  const second = viewProgramModel(definition, exposed, () => true, f.transport);
  t.after(() => second.stop()); await second.start(); assert.equal(f.requests.length, 2);
  f.requests[0]!.resolve(ready); await delay(0);
  assert.ok(Object.values(second.snapshot().state.availability.journeys).every(journey => !journey.dependenciesReady));
  f.requests[1]!.resolve(ready); await delay(0);
  assert.ok(Object.values(second.snapshot().state.availability.journeys).every(journey => journey.dependenciesReady));
});

test("late subscribers receive no cached readiness and one surviving scope retains the shared observer", async t => {
  const f = controlledTransport(), scopes = viewScopes(definition, exposed, () => true, f.transport);
  t.after(() => scopes.forEach(scope => scope.model.dispose()));
  assert.equal(scopes.length, 6);
  const late = scopes.at(-1)!;
  for (const scope of scopes.slice(0, -1)) await scope.model.start();
  assert.equal(f.requests.length, 1);
  f.requests[0]!.resolve(ready); await delay(0);
  await late.model.start();
  assert.ok(Object.values(late.model.snapshot().availability.journeys).every(journey => !journey.dependenciesReady),
    "subscription must not replay evidence whose remaining deadline it cannot establish");
  assert.equal(f.requests.length, 1);
  await delay(300); assert.equal(f.requests.length, 2);
  f.requests[1]!.resolve(ready); await delay(0);
  assert.ok(scopes.every(scope => Object.values(scope.model.snapshot().availability.journeys).every(journey => journey.dependenciesReady)));
  scopes.slice(0, -1).forEach(scope => scope.model.dispose());
  await delay(300); assert.equal(f.requests.length, 3);
  late.model.dispose(); f.requests[2]!.resolve(ready);
  await delay(300); assert.equal(f.requests.length, 3);
});
