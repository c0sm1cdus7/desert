import test from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { sharedWebConnection } from "../src/web/client/connection.ts";
import type { AvailabilitySnapshot } from "../src/availability-types.ts";
import type { ControllerTransport } from "../src/web/client/transport.ts";
import type { Evidence } from "../src/web/types.ts";
import { surface } from "./fixtures/view-program.ts";

const ready = (): Evidence => ({ snapshot: { contractDigest: surface.contractDigest,
  journeys: Object.fromEntries(surface.journeys.map(journey => [journey.id, { dependenciesReady: true, blockers: [] }])) }, validForMs: 5000 });
function fixture() {
  const requests: { resolve(value: Evidence): void }[] = [];
  const transport: ControllerTransport = {
    evidence() { return new Promise(resolve => { requests.push({ resolve }); }); },
    async call() { throw new Error("CONNECTION_OBSERVATION_MUST_NOT_EXECUTE_OPERATIONS"); },
  };
  return { subscribe: sharedWebConnection(surface, transport), requests };
}

test("a reentrant subscriber cannot consume old-generation evidence after the last subscription closes", async t => {
  const f = fixture(), received: AvailabilitySnapshot[] = [];
  let stopNext = () => {};
  const stopFirst = f.subscribe(() => {
    stopFirst(); stopNext = f.subscribe(snapshot => received.push(snapshot));
  });
  t.after(() => { stopFirst(); stopNext(); });
  f.requests[0]!.resolve({ ...ready(), validForMs: 30 }); await delay(0);
  assert.equal(f.requests.length, 2);
  assert.equal(received.length, 0, "a new generation must await its own validated evidence");
  f.requests[1]!.resolve(ready()); await delay(0);
  assert.equal(received.length, 1);
  await delay(60);
  assert.equal(received.length, 1, "the expired old generation cannot publish into its replacement");
  stopNext(); await delay(300);
  assert.equal(f.requests.length, 2, "the old generation cannot leave an orphan polling timer");
});

test("shared evidence is a detached immutable observation and duplicate callback subscriptions have distinct lifetimes", async t => {
  const f = fixture(), received: AvailabilitySnapshot[] = [];
  const callback = (snapshot: AvailabilitySnapshot) => received.push(snapshot);
  const stopFirst = f.subscribe(callback), stopSecond = f.subscribe(callback);
  t.after(() => { stopFirst(); stopSecond(); });
  stopFirst(); stopFirst();
  const observation = ready(); f.requests[0]!.resolve(observation); await delay(0);
  assert.equal(received.length, 1, "an idempotent unsubscribe cannot remove another subscription");
  const snapshot = received[0]!, journey = surface.journeys[0]!.id;
  assert.notEqual(snapshot, observation.snapshot);
  assert.ok(Object.isFrozen(snapshot) && Object.isFrozen(snapshot.journeys[journey]));
  assert.throws(() => Object.assign(snapshot.journeys[journey]!, { dependenciesReady: false }), TypeError);
  Object.assign(observation.snapshot.journeys[journey]!, { dependenciesReady: false });
  assert.equal(snapshot.journeys[journey]!.dependenciesReady, true);
});

test("one canonical verifier rejects mismatched evidence for every subscriber and the next real observation can recover", async t => {
  const f = fixture(), first: AvailabilitySnapshot[] = [], second: AvailabilitySnapshot[] = [];
  const stopFirst = f.subscribe(snapshot => first.push(snapshot));
  const stopSecond = f.subscribe(snapshot => second.push(snapshot));
  t.after(() => { stopFirst(); stopSecond(); });
  const invalid = ready(); f.requests[0]!.resolve({ ...invalid, snapshot: { ...invalid.snapshot, contractDigest: "wrong-contract" } });
  await delay(0);
  assert.equal(first.length, 1); assert.equal(second.length, 1);
  assert.strictEqual(first[0], second[0]);
  assert.ok(Object.values(first[0]!.journeys).every(journey => !journey.dependenciesReady &&
    journey.blockers.every(blocker => blocker.reason === "incompatible")));
  await delay(300); assert.equal(f.requests.length, 2);
  f.requests[1]!.resolve(ready()); await delay(0);
  assert.ok([first, second].every(values => Object.values(values.at(-1)!.journeys).every(journey => journey.dependenciesReady)));
});

test("a failing observer cannot poison evidence, interrupt invalidation or miss its next recovery observation", async t => {
  const f = fixture(), received: AvailabilitySnapshot[] = [], recovered: AvailabilitySnapshot[] = [];
  let broken = true;
  const stopFirst = f.subscribe(snapshot => { if (broken) throw new Error("private-details-must-not-be-logged"); recovered.push(snapshot); });
  const stopSecond = f.subscribe(snapshot => received.push(snapshot));
  t.after(() => { stopFirst(); stopSecond(); });
  f.requests[0]!.resolve({ ...ready(), validForMs: 30 }); await delay(0);
  assert.ok(Object.values(received[0]!.journeys).every(journey => journey.dependenciesReady));
  await delay(60);
  assert.ok(Object.values(received[1]!.journeys).every(journey => !journey.dependenciesReady));
  assert.deepEqual(f.subscribe.diagnostics(), [{ code: "CONNECTION_SUBSCRIBER_FAILED", subscriptions: 1 }],
    "one finite diagnostic per subscription, without private exception data");
  assert.ok(Object.isFrozen(f.subscribe.diagnostics()) && Object.isFrozen(f.subscribe.diagnostics()[0]));
  broken = false;
  await delay(250);
  f.requests[1]!.resolve(ready()); await delay(0);
  assert.equal(recovered.length, 1);
  assert.ok(Object.values(recovered[0]!.journeys).every(journey => journey.dependenciesReady));
  assert.equal(f.subscribe.diagnostics()[0]!.subscriptions, 1);
});
