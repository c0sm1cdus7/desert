import assert from "node:assert/strict";
import test from "node:test";
import { createAvailability } from "../src/availability.ts";
import { localPlan, remotePlan, mixedPlan, manualClock } from "./fixtures/availability.ts";
import type { AvailabilitySnapshot } from "../src/client.ts";

test("local dependencies become ready without any Internet signal; readiness grants no execution", () => {
  const plan = localPlan();
  const runtime = createAvailability(plan, { clock: manualClock() });
  assert.equal(runtime.snapshot().journeys["create-note"]!.dependenciesReady, false);
  runtime.begin("notes").ready(plan.contractDigest, 100);
  for (const journey of Object.values(runtime.snapshot().journeys)) {
    assert.equal(journey.dependenciesReady, true);
    assert.deepEqual(journey.blockers, []);
  }
  assert.equal("execute" in runtime, false);
  assert.equal("authorized" in runtime.snapshot().journeys["create-note"]!, false);
  runtime.begin("notes").unavailable("unavailable");
  assert.equal(runtime.snapshot().journeys["read-note"]!.dependenciesReady, false);
  runtime.dispose();
});

test("only journeys requiring the disconnected dependency change, and subscribers update in place", () => {
  const plan = mixedPlan();
  const runtime = createAvailability(plan, { clock: manualClock() });
  const events: AvailabilitySnapshot[] = [];
  runtime.subscribe(snapshot => events.push(snapshot));
  runtime.begin("notes").ready(plan.contractDigest, 100);
  const remote = runtime.begin("archive-link");
  remote.ready(plan.contractDigest, 100);
  assert.equal(runtime.snapshot().journeys["archive-note"]!.dependenciesReady, true);
  remote.unavailable("unreachable");
  const last = events.at(-1)!;
  assert.equal(last.journeys["create-note"]!.dependenciesReady, true);
  assert.equal(last.journeys["read-note"]!.dependenciesReady, true);
  assert.deepEqual(last.journeys["archive-note"]!.blockers,
    [{ dependency: "archive-link", reason: "unreachable" }]);
  remote.ready(plan.contractDigest, 100);
  assert.equal(events.at(-1)!.journeys["archive-note"]!.dependenciesReady, true);
  assert.equal(Object.isFrozen(last.journeys), true);
  runtime.dispose();
});

test("remote readiness uses a matching dependency observation, not public Internet status", () => {
  const plan = remotePlan();
  const runtime = createAvailability(plan, { clock: manualClock() });
  const controller = runtime.begin("notes");
  controller.ready(plan.contractDigest, 100);
  assert.equal(runtime.snapshot().journeys["read-note"]!.dependenciesReady, true);
  controller.unavailable("session-required");
  assert.equal(runtime.snapshot().journeys["read-note"]!.blockers[0]!.reason, "session-required");
  controller.ready("another-contract", 100);
  assert.equal(runtime.snapshot().journeys["read-note"]!.blockers[0]!.reason, "incompatible");
  runtime.dispose();
});

test("leases expire and notify without navigation, polling, or a new network event", () => {
  const plan = localPlan();
  const clock = manualClock();
  const runtime = createAvailability(plan, { clock });
  let latest = runtime.snapshot();
  runtime.subscribe(snapshot => { latest = snapshot; });
  runtime.begin("notes").ready(plan.contractDigest, 10);
  clock.advance(9);
  assert.equal(latest.journeys["read-note"]!.dependenciesReady, true);
  clock.advance(1);
  assert.deepEqual(latest.journeys["read-note"]!.blockers, [{ dependency: "notes", reason: "stale" }]);
  assert.equal(clock.pending(), 0);
  runtime.dispose();
});

test("a replaced session cannot deliver late readiness or change the active observation", () => {
  const plan = localPlan();
  const runtime = createAvailability(plan, { clock: manualClock() });
  const oldSession = runtime.begin("notes");
  const current = runtime.begin("notes");
  current.unavailable("session-required");
  assert.equal(oldSession.ready(plan.contractDigest, 100), false);
  assert.equal(runtime.snapshot().journeys["read-note"]!.blockers[0]!.reason, "session-required");
  assert.equal(oldSession.close(), false);
  current.ready(plan.contractDigest, 100);
  current.close();
  assert.equal(current.ready(plan.contractDigest, 100), false);
  assert.equal(runtime.snapshot().journeys["read-note"]!.dependenciesReady, false);
  runtime.dispose();
});

test("unknown dependencies, invalid leases and use after disposal fail closed", () => {
  const plan = localPlan();
  const clock = manualClock();
  const runtime = createAvailability(plan, { clock });
  assert.throws(() => runtime.begin("invented"), /Unknown dependency/);
  const reporter = runtime.begin("notes");
  for (const duration of [0, -1, Infinity, NaN, 0.5, 2147483648]) {
    assert.throws(() => reporter.ready(plan.contractDigest, duration), /Invalid lease/);
  }
  assert.throws(() => reporter.unavailable("online" as any), /Unknown availability reason/);
  reporter.ready(plan.contractDigest, 100);
  runtime.dispose();
  assert.equal(clock.pending(), 0);
  assert.equal(reporter.ready(plan.contractDigest, 100), false);
  assert.throws(() => runtime.begin("notes"), /disposed/);
  assert.equal(runtime.snapshot().journeys["read-note"]!.dependenciesReady, false);
});
