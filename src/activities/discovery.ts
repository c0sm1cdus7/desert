import type { PoolClient } from "pg";
import { freezeDeep, jsonSnapshot } from "../json.ts";
import type { LocalProgram } from "../local/program.ts";
import { createSchemaValidator } from "../validation.ts";
import { ActivityListSchema, type ActivityListOptions } from "./schema.ts";
import type { ActivityRecord } from "./records.ts";
import type { ActivityCatalog } from "./catalog.ts";
import { activityAttention } from './attention.ts';

const validate = createSchemaValidator<ActivityListOptions>(ActivityListSchema);

export function snapshotActivityListOptions(input: unknown): ActivityListOptions {
  const options = jsonSnapshot(input);
  if (!validate(options)) throw new Error("INVALID_ACTIVITY_LIST");
  return options;
}

export async function listActivities(client: PoolClient, program: LocalProgram, catalog: ActivityCatalog,
  actor: string, surface: string, options: ActivityListOptions) {
  const { limit = 50, after } = options;
  if (after && !(await client.query("SELECT id FROM desert_activities WHERE id = $1 AND actor = $2 AND surface = $3",
    [after, actor, surface])).rows.length) throw new Error("NOT_FOUND");
  const { rows } = await client.query<Pick<ActivityRecord, "id" | "revision" | "phase" | "plan" | "options" | "created_at" | "expires_at" | "catalog_digest">>(
    `SELECT id, revision, phase, plan, options, created_at, expires_at, catalog_digest FROM desert_activities
    WHERE actor = $1 AND surface = $2 AND phase IN ('draft', 'prepared') AND expires_at > clock_timestamp()
      AND ($3::uuid IS NULL OR (created_at, id) < (SELECT created_at, id FROM desert_activities WHERE id = $3))
    ORDER BY created_at DESC, id DESC LIMIT $4`, [actor, surface, after ?? null, limit + 1]);
  const items = (await Promise.all(rows.slice(0, limit).map(async record => {
    const attention=await activityAttention(client,program,actor,surface,record,record.catalog_digest===catalog.digest);
    if(!attention)return [];
    return [{ id: record.id, revision: record.revision, phase: record.phase, journey: record.plan.journey, attention,
      createdAt: record.created_at.toISOString(), expiresAt: record.expires_at.toISOString(),
      availability: record.catalog_digest === catalog.digest ? "available" as const : "catalog-changed" as const }];
  }))).flat();
  return freezeDeep({ items, ...(rows.length > limit ? { nextCursor: rows[limit-1]!.id } : {}) });
}
