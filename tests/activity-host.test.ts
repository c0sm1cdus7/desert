import assert from "node:assert/strict";
import { test } from "node:test";
import { compile } from "../src/compile.ts";
import { compileViewProgram } from "../src/views/program.ts";
import { activityModel } from "../src/web/client/activity-model.ts";
import { activityJournal, requireActivityJournalEntry, type ActivityHost } from "../src/web/client/activity-host.ts";
import { viewProgramModel } from "../src/web/client/view-program.ts";
import type { HumanSurface } from "../src/web/types.ts";
import type { ControllerTransport } from "../src/web/client/transport.ts";
import { ActivityNotebook, guidedProgram } from "./fixtures/activity-experience.ts";

test("activity execution requires a finite occurrence host and cannot fall back to ambient browser globals", async () => {
  const surface = compile(ActivityNotebook).surface("human") as HumanSurface;
  const program = compileViewProgram(guidedProgram, surface);
  const experience = program.journeys.find(item => item.kind === "activity")!;
  assert.equal(experience.kind, "activity");
  assert.throws(() => viewProgramModel(program, surface, () => true), /ACTIVITY_HOST_REQUIRED/);
  let calls = 0;
  const transport: ControllerTransport = { async evidence() { throw new Error("Unused"); },
    async call() { calls++; throw new Error("Must not call the controller"); } };
  const model = activityModel(surface, transport, () => {}, async () => {});
  await model.open(experience);
  assert.equal(calls, 0);
  assert.ok(model.snapshot().error);
  model.dispose();
});

test("the journal refuses private data and persistence failure prevents activity creation", async () => {
  assert.throws(() => requireActivityJournalEntry({ journey: "guided", occurrence: "request", draft: "private" }), /INVALID_ACTIVITY_JOURNAL/);
  const host: ActivityHost = { load: () => null, save() { throw new Error("Unavailable storage"); }, clear() {}, createOccurrence: () => "request" };
  assert.throws(() => activityJournal(host).write("guided", "request"), /Unavailable storage/);
  const surface = compile(ActivityNotebook).surface("human") as HumanSurface;
  const experience = compileViewProgram(guidedProgram, surface).journeys.find(item => item.kind === "activity")!;
  let calls = 0;
  const model = activityModel(surface, { async evidence() { throw new Error("Unused"); }, async call() { calls++; throw new Error("No write"); } },
    () => {}, async () => {}, host);
  await model.open(experience);
  assert.equal(calls, 0);
  assert.equal(model.snapshot().activity, null);
  model.dispose();
});
