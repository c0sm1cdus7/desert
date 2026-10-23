import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { TestContext } from "node:test";
import { compile } from "../../src/compile.ts";
import { openLocalController } from "../../src/local/controller.ts";
import { viewProgramActivities } from "../../src/activities/presentation.ts";
import { activityModel } from "../../src/web/client/activity-model.ts";
import type { ActivityHost, ActivityJournalEntry } from "../../src/web/client/activity-host.ts";
import { TransportError, type ControllerTransport } from "../../src/web/client/transport.ts";
import type { HumanSurface } from "../../src/web/types.ts";
import { dispatch } from "../../src/web/dispatch.ts";
import { compileViewProgram } from "../../src/views/program.ts";
import { ActivityNotebook, guidedProgram } from "../../tests/fixtures/activity-experience.ts";
import { postgresCluster } from "../../tests/fixtures/postgres.ts";

export async function activityClientFixture(t: TestContext) {
  const application = compile(ActivityNotebook), surface = application.surface("human") as HumanSurface;
  const program = compileViewProgram(guidedProgram, surface);
  const experience = program.journeys.find(item => item.kind === "activity")!;
  assert.equal(experience.kind, "activity");
  const activities = viewProgramActivities(application, program, "human"); assert.ok(activities);
  const cluster = postgresCluster(); t.after(() => cluster.dispose());
  const controller = await openLocalController(application, { ...await cluster.database(), roles: ["notes"], activities });
  t.after(() => controller.close());
  const identity = await controller.identities.issue("Saved activity witness");
  const session = controller.connect(identity.token, "human");
  let entry: ActivityJournalEntry | null = null, occurrenceCount = 0;
  const journal: ActivityHost = {
    load: () => entry, save: value => { entry = structuredClone(value); }, clear: () => { entry = null; },
    createOccurrence() { occurrenceCount++; return randomUUID(); },
  };
  const calls: { method: string; input: unknown }[] = [];
  let loseCancellationReply = false;
  const transport: ControllerTransport = {
    async evidence() { throw new Error("Not used by this activity-model witness"); },
    async call(method, input) {
      calls.push({ method, input: structuredClone(input) });
      const result = await dispatch(session, method, input);
      if (method === "activityCancel" && loseCancellationReply) {
        loseCancellationReply = false;
        throw new TransportError("CONNECTION_LOST");
      }
      return result;
    },
  };
  const models: ReturnType<typeof activityModel>[] = [];
  function model() {
    const instance = activityModel(surface, transport, () => {}, async () => {}, journal);
    models.push(instance); return instance;
  }
  t.after(() => models.forEach(instance => instance.dispose()));
  async function seed(title: string) {
    const occurrence = randomUUID(), created = await session.activityCreate(occurrence, experience.activity);
    const activity = await session.activityAnswer(created.id, created.revision, 0, { title });
    return { activity, occurrence };
  }
  return { surface, program, experience, controller, session, model, seed, journal, calls,
    occurrenceCount: () => occurrenceCount, journalEntry: () => entry,
    loseNextCancellationReply() { loseCancellationReply = true; },
  };
}
