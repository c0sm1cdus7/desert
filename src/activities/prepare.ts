import type { PoolClient } from "pg";
import type { LocalProgram } from "../local/program.ts";
import { beginJourney } from "../local/admission.ts";
import { prepareMutation } from "../local/prepare.ts";
import { preflightMutation } from "../local/preflight.ts";
import { admittedRun } from "../local/records.ts";
import type { Intent } from "../local/types.ts";
import { preparedView } from "../local/effects.ts";
import type { ActivityIndex } from "./activity-index.ts";
import { activityRecord, activitySnapshot, requireEditableActivity, type ActivityRecord } from "./records.ts";
import { activityProgress } from "./progress.ts";

export async function prepareActivity(client: PoolClient, program: LocalProgram, catalog: ActivityIndex,
  actor: string, surface: string, id: string, revision: number, lifetime: number) {
  const record = await activityRecord(client, program, catalog, actor, surface, id, true);
  await requireEditableActivity(client, record, revision);
  if (record.intent_id) {
    const { rows: [intent] } = await client.query<Intent>("SELECT * FROM desert_intents WHERE id = $1", [record.intent_id]);
    if (!intent) throw new Error("CORRUPT_ACTIVITY_INTENT");
    const run = await admittedRun(client, program, actor, surface, intent.run_id);
    return { activity: activitySnapshot(record), intent: preparedView(program, run, intent) };
  }
  const progress = activityProgress(record.plan, record.answers, record.completed);
  if (progress.nextStep !== null) throw new Error("ACTIVITY_INCOMPLETE");
  const preflight = await preflightMutation(client, program, actor, surface, record.plan.journey, progress.input, record.options);
  if (preflight.status !== "ready") throw new Error("ACTIVITY_NOT_READY");
  const run = await beginJourney(client, program, actor, surface, record.plan.journey, record.options.subject, lifetime);
  const base = record.options.expectedVersion === undefined ? undefined : { expectedVersion: record.options.expectedVersion };
  const intent = await prepareMutation(client, program, actor, surface, run.id, progress.input, base);
  await client.query("INSERT INTO desert_activity_intents VALUES ($1, $2, $3)", [intent.id, id, revision]);
  const { rows: [updated] } = await client.query<ActivityRecord>(`UPDATE desert_activities
    SET phase = 'prepared', intent_id = $2 WHERE id = $1 RETURNING *`, [id, intent.id]);
  return { activity: activitySnapshot(updated!), intent };
}
