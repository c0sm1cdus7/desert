import type { PoolClient } from "pg";
import { requireUUID } from "../local/types.ts";
import { activityDigest, type ActivityCatalog } from "./catalog.ts";

export async function requireCurrentActivityIntent(client: PoolClient, intentId: string, actor: string, surface: string,
  catalog?: ActivityCatalog) {
  requireUUID(intentId);
  const { rows: [activity] } = await client.query(`SELECT a.*, link.revision AS prepared_revision
    FROM desert_activity_intents link JOIN desert_activities a ON a.id = link.activity_id
    WHERE link.intent_id = $1 AND a.actor = $2 AND a.surface = $3 FOR UPDATE OF a`, [intentId, actor, surface]);
  if (!activity) return;
  if (!catalog) throw new Error("ACTIVITY_CATALOG_NOT_INSTALLED");
  if (activity.catalog_digest !== catalog.digest) throw new Error("ACTIVITY_CATALOG_CHANGED");
  if (activity.plan_digest !== activityDigest(catalog.admit(activity.plan))) throw new Error("CORRUPT_ACTIVITY_PLAN");
  if (activity.revision !== activity.prepared_revision || activity.intent_id !== intentId
    || !["prepared", "completed"].includes(activity.phase)) throw new Error("ACTIVITY_PREPARATION_INVALIDATED");
  if (activity.phase !== "completed") {
    const { rows: [clock] } = await client.query("SELECT clock_timestamp() AS time");
    if (activity.expires_at <= clock.time) throw new Error("ACTIVITY_EXPIRED");
  }
}

export async function completeActivityIntent(client: PoolClient, intentId: string) {
  await client.query("UPDATE desert_activities SET phase = 'completed' WHERE intent_id = $1", [intentId]);
}
