import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { compile } from "../src/compile.ts";
import { openLocalController } from "../src/local/controller.ts";
import { viewProgramActivities } from "../src/activities/presentation.ts";
import { activityModel } from "../src/web/client/activity-model.ts";
import { dispatch } from "../src/web/dispatch.ts";
import { TransportError, type ControllerTransport } from "../src/web/client/transport.ts";
import type { HumanSurface, Receipt } from "../src/web/types.ts";
import { compileViewProgram } from "../src/views/program.ts";
import { ActivityNotebook, guidedProgram } from "./fixtures/activity-experience.ts";
import { postgresCluster } from "./fixtures/postgres.ts";
import { randomUUID } from "node:crypto";
import type { ActivityHost, ActivityJournalEntry } from "../src/web/client/activity-host.ts";

let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); });
after(() => cluster.dispose());

test("lost accept replies survive client reload and recover the same operation without replay", async t => {
  const application = compile(ActivityNotebook), surface = application.surface("human") as HumanSurface;
  const program = compileViewProgram(guidedProgram, surface), experience = program.journeys.find(item => item.kind === "activity")!;
  assert.equal(experience.kind, "activity");
  const activities = viewProgramActivities(application, program, "human"); assert.ok(activities);
  const host = await openLocalController(application, { ...await cluster.database(), roles: ["notes"], activities });
  t.after(() => host.close());
  const identity = await host.identities.issue("Recovery writer"), session = host.connect(identity.token, "human");
  let saved: ActivityJournalEntry | null = null;
  const journal: ActivityHost = { load: () => saved, save: entry => { saved = structuredClone(entry); },
    clear: () => { saved = null; }, createOccurrence: randomUUID };
  let lost = true, acceptCalls = 0;
  const transport: ControllerTransport = {
    async evidence() { throw new Error("Unused by the activity interpreter"); },
    async call(method, input) {
      const result = await dispatch(session, method, input);
      if (method === "accept") { acceptCalls++; if (lost) { lost = false; throw new TransportError("CONNECTION_LOST"); } }
      return result;
    },
  };
  const receipts: Receipt[] = [];
  let model = activityModel(surface, transport, () => {}, async (_, receipt) => { receipts.push(receipt); }, journal);
  t.after(() => model.dispose());
  await model.open(experience); model.edit("title", "Private title"); await model.next();
  model.edit("body", "Private body"); await model.next();
  const prepared = model.snapshot().prepared!; assert.ok(prepared);
  assert.equal(JSON.stringify(saved).includes("Private"), false, "host journal stores no answer or prepared facts");
  await model.accept();
  assert.equal(model.snapshot().uncertain, true);
  assert.equal(receipts.length, 0);
  model.close(); assert.ok(model.snapshot().prepared, "uncertain operations cannot be dismissed");
  await session.activityCreate(randomUUID(), experience.activity);
  model.dispose(); assert.deepEqual(model.snapshot().draft, {});
  model = activityModel(surface, transport, () => {}, async (_, receipt) => { receipts.push(receipt); }, journal);
  assert.equal(model.pendingJourney(), experience.id);
  await model.open(experience);
  assert.equal(model.snapshot().error, null);
  assert.equal(receipts[0]?.id, prepared.id);
  assert.equal(acceptCalls, 1, "reload queries receipt; it never replays acceptance");
  assert.equal((await session.read((await session.begin("read-note")).id)).length, 1);
  assert.equal(saved, null);
});
