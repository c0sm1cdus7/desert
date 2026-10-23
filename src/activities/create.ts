import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { LocalProgram } from "../local/program.ts";
import { requireUUID } from "../local/types.ts";
import { preflightMutation } from "../local/preflight.ts";
import { snapshotPreflightOptions, type PreflightOptions } from "../preflight.ts";
import { activityDigest, type ActivityIndex } from "./activity-index.ts";
import { activitySnapshot, checkedActivityRecord, type ActivityRecord } from "./records.ts";

export async function createActivity(client: PoolClient, program: LocalProgram, catalog: ActivityIndex,
  actor: string, surface: string, occurrence: string, input: unknown, metadata: PreflightOptions = {}) {
  requireUUID(occurrence);
  const plan = catalog.admit(input), options = snapshotPreflightOptions(metadata);
  const requestDigest = activityDigest({ plan, options });
  const existing = async () => (await client.query<ActivityRecord>(`SELECT * FROM desert_activities
    WHERE actor = $1 AND surface = $2 AND occurrence = $3 FOR UPDATE`, [actor, surface, occurrence])).rows[0];
  const resume = (record: ActivityRecord) => {
    if (record.request_digest !== requestDigest) throw new Error("ACTIVITY_OCCURRENCE_CONFLICT");
    return activitySnapshot(checkedActivityRecord(program, catalog, surface, record));
  };
  const previous = await existing();
  if (previous) return resume(previous);
  await preflightMutation(client, program, actor, surface, plan.journey, {}, options);
  const { rows: [record] } = await client.query<ActivityRecord>(`INSERT INTO desert_activities
    (id, actor, surface, occurrence, request_digest, catalog_digest, plan_digest, plan, options,
      revision, answers, completed, phase, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, '{}', '[]', 'draft', clock_timestamp() + interval '7 days')
    ON CONFLICT (actor, surface, occurrence) DO NOTHING RETURNING *`,
    [randomUUID(), actor, surface, occurrence, requestDigest, catalog.digest, activityDigest(plan), JSON.stringify(plan), JSON.stringify(options)]);
  if (record) return activitySnapshot(record);
  // The unique occurrence waits for a concurrent creator; a new statement sees
  // its committed revision, never resets it or manufactures a replacement draft.
  const concurrent = await existing();
  if (!concurrent) throw new Error("ACTIVITY_OCCURRENCE_UNAVAILABLE");
  return resume(concurrent);
}
