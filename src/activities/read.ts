import type { PoolClient } from "pg";
import type { LocalProgram } from "../local/program.ts";
import type { ActivityCatalog } from "./catalog.ts";
import { activityRecord, activitySnapshot } from "./records.ts";
import { loadIntent } from "../local/accept.ts";
import { preparedView } from "../local/effects.ts";

export async function readActivity(client: PoolClient, program: LocalProgram, catalog: ActivityCatalog,
  actor: string, surface: string, id: string) {
  const record = await activityRecord(client, program, catalog, actor, surface, id);
  const prepared = record.intent_id ? await loadIntent(client, program, actor, surface, record.intent_id) : undefined;
  return { ...activitySnapshot(record), ...(prepared ? { prepared: preparedView(program, prepared.run, prepared.intent) } : {}) };
}
