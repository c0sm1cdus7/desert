import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { compile } from "../src/compile.ts";
import { openLocalController } from "../src/local/controller.ts";
import { viewProgramActivities } from "../src/activities/presentation.ts";
import { compileViewProgram } from "../src/views/program.ts";
import { activityModel } from "../src/web/client/activity-model.ts";
import type { ActivityHost, ActivityJournalEntry } from "../src/web/client/activity-host.ts";
import type { ControllerTransport } from "../src/web/client/transport.ts";
import { dispatch } from "../src/web/dispatch.ts";
import type { LocalSession } from "../src/local/session.ts";
import type { HumanSurface } from "../src/web/types.ts";
import { ActivityNotebook, guidedProgram } from "./fixtures/activity-experience.ts";
import { postgresCluster } from "./fixtures/postgres.ts";

test("a locked identity's journal cannot expose answers to the next identity or prevent its own activity", async t => {
  const application = compile(ActivityNotebook), surface = application.surface("human") as HumanSurface;
  const catalog = viewProgramActivities(application, guidedProgram, "human"); assert.ok(catalog);
  const experience = compileViewProgram(guidedProgram, surface).journeys.find(item => item.kind === "activity")!;
  const cluster = postgresCluster(); t.after(() => cluster.dispose());
  const host = await openLocalController(application, { ...await cluster.database(), roles: ["notes"], activities: catalog });
  t.after(() => host.close());
  const owner = await host.identities.issue("First identity"), other = await host.identities.issue("Next identity");
  const session = host.connect(owner.token, "human"), foreign = host.connect(other.token, "human");
  let saved: ActivityJournalEntry | null = null;
  const journal: ActivityHost = { load: () => saved, save: entry => { saved = structuredClone(entry); },
    clear: () => { saved = null; }, createOccurrence: randomUUID };
  const transport = (session: LocalSession): ControllerTransport => ({
    async evidence() { throw new Error("Unused"); }, call: (method, input) => dispatch(session, method, input),
  });
  const model = activityModel(surface, transport(session), () => {}, async () => {}, journal);
  await model.open(experience); model.edit("title", "First identity's private answer"); await model.next();
  const original = model.snapshot().activity!.id;
  model.dispose();
  assert.deepEqual(model.snapshot().draft, {});
  const next = activityModel(surface, transport(foreign), () => {}, async () => {}, journal);
  t.after(() => next.dispose());
  await next.open(experience);
  assert.equal(next.snapshot().activity, null);
  assert.deepEqual(next.snapshot().draft, {});
  assert.ok(next.snapshot().error);
  assert.equal(JSON.stringify(next.snapshot()).includes("First identity's private answer"), false);
  assert.deepEqual((await foreign.activityList()).items, []);
  next.close(); await next.open(experience);
  assert.equal(next.snapshot().error, null);
  assert.notEqual(next.snapshot().activity?.id, original);
  assert.equal(next.snapshot().activity?.progress.nextStep, 0);
  assert.deepEqual((await session.activityRead(original)).progress.input, { title: "First identity's private answer" });
});
