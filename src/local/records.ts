import type { PoolClient } from "pg";
import type { LocalProgram } from "./program.ts";
import type { Run, StoredObject } from "./types.ts";
import { requireUUID } from "./types.ts";

export async function ownedObject(client: PoolClient, program: LocalProgram, actor: string, type: string, id: string, lock = true) {
  requireUUID(id);
  const { rows: [record] } = await client.query<StoredObject>(
    `SELECT * FROM desert_objects WHERE id = $1 AND object_type = $2${lock ? " FOR UPDATE" : ""}`, [id, type]);
  if (!record || record.facts[program.owners.get(type)!] !== actor) throw new Error("NOT_FOUND");
  if (!program.application.validate(type, record.facts).valid) throw new Error("CORRUPT_OBJECT");
  return record;
}

export async function admittedRun(client: PoolClient, program: LocalProgram, actor: string,
  surface: string, id: string, allowExpired = false) {
  requireUUID(id);
  const { rows: [run] } = await client.query<Run>(
    "SELECT * FROM desert_runs WHERE id = $1 AND actor = $2 AND surface = $3 FOR UPDATE", [id, actor, surface]);
  if (!run) throw new Error("NOT_FOUND");
  if (run.contract_digest !== program.application.digest) throw new Error("CONTRACT_MISMATCH");
  program.journey(surface, run.journey);
  if (!allowExpired) await requireLiveRun(client, run);
  return run;
}

export async function requireLiveRun(client: PoolClient, run: Run) {
  const { rows: [clock] } = await client.query("SELECT clock_timestamp() AS time");
  if (run.expires_at <= clock.time) throw new Error("RUN_EXPIRED");
}
