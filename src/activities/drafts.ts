import type { PoolClient } from "pg";
import { jsonSnapshot } from "../json.ts";
import type { LocalProgram } from "../local/program.ts";
import type { ActivityCatalog } from "./catalog.ts";
import { activityRecord, activitySnapshot, requireEditableActivity, type ActivityRecord } from "./records.ts";
import { activityProgress } from "./progress.ts";
import { activityAnswerValidation } from "./answer-validation.ts";

export async function answerActivity(client: PoolClient, program: LocalProgram, catalog: ActivityCatalog,
  actor: string, surface: string, id: string, revision: number, stepIndex: number, input: unknown) {
  const record = await activityRecord(client, program, catalog, actor, surface, id, true);
  await requireEditableActivity(client, record, revision);
  const progress = activityProgress(record.plan, record.answers, record.completed);
  if (!Number.isSafeInteger(stepIndex) || !progress.activeSteps.includes(stepIndex)) throw new Error("ACTIVITY_STEP_NOT_ACTIVE");
  const step = record.plan.steps[stepIndex]!, values = jsonSnapshot(input);
  if (!values || typeof values !== "object" || Array.isArray(values)
    || Object.keys(values).some(field => !step.inputs.includes(field))) throw new Error("INVALID_ACTIVITY_ANSWER");
  const journey = program.journey(surface, record.plan.journey);
  if (journey.kind !== "mutation") throw new Error("NOT_A_MUTATION_JOURNEY");
  const validation = program.application.validateInput(journey.command.id, values);
  if (!activityAnswerValidation(validation, step.inputs).valid) throw new Error("INVALID_ACTIVITY_ANSWER");
  const answers = { ...record.answers, [stepIndex]: values }, completed = record.completed.filter(index => index < stepIndex);
  completed.push(stepIndex);
  const { rows: [updated] } = await client.query<ActivityRecord>(`UPDATE desert_activities
    SET revision = revision + 1, answers = $2, completed = $3, phase = 'draft', intent_id = NULL WHERE id = $1 RETURNING *`,
    [id, JSON.stringify(answers), JSON.stringify(completed)]);
  return activitySnapshot(updated!);
}

export async function cancelActivity(client: PoolClient, program: LocalProgram, catalog: ActivityCatalog,
  actor: string, surface: string, id: string, revision: number) {
  const record = await activityRecord(client, program, catalog, actor, surface, id, true);
  await requireEditableActivity(client, record, revision);
  const { rows: [updated] } = await client.query<ActivityRecord>(`UPDATE desert_activities
    SET revision = revision + 1, phase = 'cancelled', intent_id = NULL WHERE id = $1 RETURNING *`, [id]);
  return activitySnapshot(updated!);
}

export async function reopenActivity(client: PoolClient, program: LocalProgram, catalog: ActivityCatalog,
  actor: string, surface: string, id: string, revision: number, stepIndex: number) {
  const record = await activityRecord(client, program, catalog, actor, surface, id, true);
  await requireEditableActivity(client, record, revision);
  const progress = activityProgress(record.plan, record.answers, record.completed);
  if (!Number.isSafeInteger(stepIndex) || !progress.activeSteps.includes(stepIndex)) throw new Error("ACTIVITY_STEP_NOT_ACTIVE");
  const completed = record.completed.filter(index => index < stepIndex);
  const { rows: [updated] } = await client.query<ActivityRecord>(`UPDATE desert_activities
    SET revision = revision + 1, completed = $2, phase = 'draft', intent_id = NULL WHERE id = $1 RETURNING *`,
    [id, JSON.stringify(completed)]);
  return activitySnapshot(updated!);
}
