import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import { viewProgramModel } from "../src/web/client/view-program.ts";
import { program, surface } from "./fixtures/view-program.ts";
import { runtimeFixture, until } from "./fixtures/view-program-runtime.ts";
import { pollTimers } from "./fixtures/poll-timers.ts";

test("the same journey interpreter consumes an injected controller port without browser fetch", async t => {
  const application = compile(Notebook), calls: string[] = [];
  let browserCalls = 0;
  t.mock.method(globalThis, "fetch", async () => { browserCalls++; throw new Error("Browser transport forbidden"); });
  const transport = {
    async evidence() {
      calls.push("availability");
      return { validForMs: 5000, snapshot: { contractDigest: surface.contractDigest,
        journeys: Object.fromEntries(surface.journeys.map(journey => [journey.id, { dependenciesReady: true, blockers: [] }])) } };
    },
    async call() { throw new Error("Presentation must not execute"); },
  };
  const model = viewProgramModel(program, surface, (id, input) => application.validateInput(id, input).valid, transport);
  t.after(() => model.stop());
  await model.start();
  await until(() => model.snapshot().state.availability.journeys["create-note"]?.dependenciesReady === true);
  assert.equal(model.snapshot().activeDestination, "home");
  model.navigate("catalog");
  assert.equal(model.snapshot().activeDestination, "catalog");
  assert.equal(browserCalls, 0);
  assert.ok(calls.length > 0);
});

test("browser and injected-port runs retain identical review, loss and original-receipt recovery", async t => {
  const traces: unknown[] = [];
  for (const transport of [undefined, "port"] as const) {
    await t.test(transport ?? "web", async t => {
      const f = await runtimeFixture(t, { mode: "review", loseAcceptance: true, ...(transport ? { transport } : {}) });
      const trace: string[] = [f.model.snapshot().activeDestination];
      f.model.navigate("notes");
      await until(() => f.model.snapshot().state.loaded);
      f.emit({ kind: "surface.invoke", intent: { kind: "view.output", view: "notes", output: "create" } });
      trace.push(f.model.snapshot().state.view);
      f.emit({ kind: "input.change", name: "title", value: "Same activity" });
      f.emit({ kind: "input.change", name: "body", value: "Same draft" });
      f.emit({ kind: "surface.invoke", intent: { kind: "view.output", view: "editor", output: "save" } });
      await until(() => f.model.snapshot().state.view === "review" && !f.model.snapshot().state.busy);
      trace.push(f.model.snapshot().state.view);
      assert.equal(f.calls.filter(call => call.method === "accept").length, 0);
      f.emit({ kind: "surface.invoke", intent: { kind: "accept" } });
      await until(() => f.model.snapshot().state.uncertain && !f.model.snapshot().state.busy);
      trace.push(f.model.snapshot().state.view);
      f.model.navigate("home"); assert.equal(f.model.snapshot().activeDestination, "notes");
      f.emit({ kind: "surface.invoke", intent: { kind: "recover" } });
      await until(() => !f.model.snapshot().state.uncertain && !f.model.snapshot().state.busy);
      trace.push(f.model.snapshot().state.view);
      assert.equal(f.records.length, 2);
      traces.push({ trace, operations: f.calls.filter(call => call.method !== "availability"), records: f.records });
    });
  }
  assert.deepEqual(traces[1], traces[0], "the host port cannot implement a second activity state machine");
});

test("injected controller unavailability preserves a draft and reconnect does not replay it", async t => {
  const f = await runtimeFixture(t, { transport: "port" });
  f.model.navigate("notes");
  f.emit({ kind: "surface.invoke", intent: { kind: "view.output", view: "notes", output: "create" } });
  f.emit({ kind: "input.change", name: "title", value: "Unsent" });
  f.emit({ kind: "input.change", name: "body", value: "Keep me" });
  f.connection.ready = false;
  await until(() => !f.model.snapshot().state.availability.journeys["create-note"]?.dependenciesReady);
  const writes = () => f.calls.filter(call => ["prepare", "accept"].includes(call.method)).length;
  f.emit({ kind: "surface.invoke", intent: { kind: "view.output", view: "editor", output: "save" } });
  assert.equal(writes(), 0);
  assert.deepEqual(f.model.snapshot().state.draft, { title: "Unsent", body: "Keep me" });
  f.connection.ready = true;
  await until(() => f.model.snapshot().state.availability.journeys["create-note"]?.dependenciesReady === true);
  assert.equal(writes(), 0);
  assert.equal(f.model.snapshot().state.view, "create");
});

test("Web start is idempotent and stop removes all polling without allowing restart", async t => {
  const timers = pollTimers(t);
  const f = await runtimeFixture(t);
  await f.model.start();
  await f.model.start();
  await until(() => timers.size > 0);
  f.model.stop();
  assert.equal(timers.size, 0, "no observer from an earlier start may survive stop");
  const calls = f.calls.length;
  await f.model.start();
  assert.equal(timers.size, 0);
  assert.equal(f.calls.length, calls, "a stopped model is terminal");
});
