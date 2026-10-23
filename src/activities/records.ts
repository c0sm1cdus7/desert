import type { PoolClient } from "pg";
import { freezeDeep } from "../json.ts";
import type { LocalProgram } from "../local/program.ts";
import { requireUUID } from "../local/types.ts";
import type { PreflightOptions } from "../preflight.ts";
import { activityDigest, type ActivityCatalog } from "./catalog.ts";
import { activityProgress } from "./progress.ts";
import type { ActivityAnswers, ActivityPlan } from "./schema.ts";

export type ActivityRecord = {
  id: string; actor: string; surface: string; catalog_digest: string; plan_digest: string;
  occurrence: string; request_digest: string; created_at: Date;
  plan: ActivityPlan; options: PreflightOptions; revision: number; answers: ActivityAnswers; completed: number[];
  phase: "draft" | "prepared" | "completed" | "cancelled"; intent_id: string | null; expires_at: Date;
};

export async function activityRecord(client: PoolClient, program: LocalProgram, catalog: ActivityCatalog,
  actor: string, surface: string, id: string, lock = false) {
  requireUUID(id);
  const { rows: [record] } = await client.query<ActivityRecord>(
    `SELECT * FROM desert_activities WHERE id = $1 AND actor = $2 AND surface = $3${lock ? " FOR UPDATE" : ""}`,
    [id, actor, surface]);
  if (!record) throw new Error("NOT_FOUND");
  return checkedActivityRecord(program, catalog, surface, record);
}

export function checkedActivityRecord(program: LocalProgram, catalog: ActivityCatalog, surface: string, record: ActivityRecord) {
  if (record.catalog_digest !== catalog.digest) throw new Error("ACTIVITY_CATALOG_CHANGED");
  record.plan = catalog.admit(record.plan);
  if (record.plan_digest !== activityDigest(record.plan)) throw new Error("CORRUPT_ACTIVITY_PLAN");
  program.journey(surface, record.plan.journey);
  return record;
}

export async function requireEditableActivity(client: PoolClient, record: ActivityRecord, revision: number) {
  if (!Number.isSafeInteger(revision) || revision !== record.revision) throw new Error("ACTIVITY_REVISION_CONFLICT");
  if (record.phase === "completed" || record.phase === "cancelled") throw new Error("ACTIVITY_CLOSED");
  const { rows: [clock] } = await client.query("SELECT clock_timestamp() AS time");
  if (record.expires_at <= clock.time) throw new Error("ACTIVITY_EXPIRED");
}

export function activitySnapshot(record: ActivityRecord) {
  const progress = activityProgress(record.plan, record.answers, record.completed);
  const current = progress.nextStep === null ? undefined : record.plan.steps[progress.nextStep];
  const retained = progress.nextStep === null ? {} : record.answers[String(progress.nextStep)] ?? {};
  const currentInput = Object.fromEntries((current?.inputs ?? []).filter(field => Object.hasOwn(retained, field))
    .map(field => [field, retained[field]!]));
  return freezeDeep({ id: record.id, revision: record.revision, phase: record.phase,
    plan: record.plan, planDigest: record.plan_digest, expiresAt: record.expires_at.toISOString(),
    progress, currentInput,
    ...(record.intent_id ? { intentId: record.intent_id } : {}) });
}
