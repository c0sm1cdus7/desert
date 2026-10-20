import assert from "node:assert/strict";
import test from "node:test";
import { createAvailability } from "../src/availability.ts";
import { localPlan, manualClock } from "./fixtures/availability.ts";

test("a subscriber changing the observation cannot leave other subscribers on an older snapshot", () => {
  const plan = localPlan();
  const runtime = createAvailability(plan, { clock: manualClock() });
  const reporter = runtime.begin("notes");
  runtime.subscribe(snapshot => {
    if (snapshot.journeys["read-note"]!.dependenciesReady) reporter.unavailable("unreachable");
  });
  let lastReady = false;
  runtime.subscribe(snapshot => { lastReady = snapshot.journeys["read-note"]!.dependenciesReady; });
  reporter.ready(plan.contractDigest, 100);
  assert.equal(lastReady, false);
  assert.equal(runtime.snapshot().journeys["read-note"]!.dependenciesReady, false);
  runtime.dispose();
});

test("one failing listener does not prevent expiry, other listeners, or disposal", () => {
  const plan = localPlan();
  const clock = manualClock();
  const errors: unknown[] = [];
  const runtime = createAvailability(plan, { clock, onListenerError: error => errors.push(error) });
  const unsubscribe = runtime.subscribe(() => { throw new Error("broken view"); });
  let lastReady = false;
  runtime.subscribe(snapshot => { lastReady = snapshot.journeys["read-note"]!.dependenciesReady; });
  runtime.begin("notes").ready(plan.contractDigest, 100);
  assert.equal(lastReady, true);
  assert.ok(errors.length > 0);
  unsubscribe();
  const count = errors.length;
  clock.advance(100);
  assert.equal(lastReady, false);
  assert.equal(errors.length, count);
  runtime.dispose();
});

test("availability uses an isolated plan and renewals replace the expiry timer", () => {
  const plan = structuredClone(localPlan());
  const clock = manualClock();
  const runtime = createAvailability(plan, { clock });
  const reporter = runtime.begin("notes");
  reporter.ready(plan.contractDigest, 100);
  Object.assign(plan, { contractDigest: "changed" });
  clock.advance(90);
  reporter.ready(runtime.snapshot().contractDigest, 100);
  assert.equal(clock.pending(), 1);
  clock.advance(10);
  assert.equal(runtime.snapshot().journeys["read-note"]!.dependenciesReady, true);
  clock.advance(90);
  assert.equal(runtime.snapshot().journeys["read-note"]!.dependenciesReady, false);
  runtime.dispose();
});
