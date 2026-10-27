import type { PoolClient } from "pg";
import { readObjects, type ObjectRecord } from "../storage/object-store.ts";
import type { LocalProgram } from "./program.ts";
import type { Run } from "./types.ts";
import { requireUUID } from "./types.ts";

/** Objects of one type that `actor` owns, from the type's generated table; every record is re-checked against the
 * declaration (CORRUPT_OBJECT), the application's half of the law Postgres also enforces. */
export async function ownedObjects(client: PoolClient, program: LocalProgram, actor: string, type: string,
  match: Readonly<{ id?: string; ids?: readonly string[]; where?: Readonly<Record<string, string | number>>; lock?: boolean }>) {
  const records = await readObjects(client, program.stored(type), { ...match, owner: actor });
  for (const record of records) if (!program.application.validate(type, record.facts).valid) throw new Error("CORRUPT_OBJECT");
  return records;
}

export async function ownedObject(client: PoolClient, program: LocalProgram, actor: string, type: string, id: string, lock = true): Promise<ObjectRecord> {
  requireUUID(id);
  const [record] = await ownedObjects(client, program, actor, type, { id, lock });
  if (!record) throw new Error("NOT_FOUND");
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
