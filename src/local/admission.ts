import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { freezeDeep } from "../json.ts";
import type { LocalProgram } from "./program.ts";
import { admittedRun, ownedObject, requireLiveRun } from "./records.ts";
import type { StoredObject } from "./types.ts";
import { matchesConditions } from "./conditions.ts";

export async function beginJourney(client: PoolClient, program: LocalProgram, actor: string,
  surface: string, journeyId: string, subject: string | undefined, lifetime: number) {
  const journey = program.journey(surface, journeyId);
  const object = journey.kind === "read" ? journey.object : journey.command.object;
  if (journey.kind === "mutation") {
    if (journey.command.kind === "create" && subject !== undefined) throw new Error("UNEXPECTED_SUBJECT");
    if (journey.command.kind === "update" && subject === undefined) throw new Error("SUBJECT_REQUIRED");
  }
  if (subject !== undefined) await ownedObject(client, program, actor, object, subject);
  const id = randomUUID();
  const { rows: [row] } = await client.query(`INSERT INTO desert_runs
    (id, actor, surface, journey, subject, contract_digest, expires_at, state)
    VALUES ($1, $2, $3, $4, $5, $6, clock_timestamp() + $7 * interval '1 millisecond', 'admitted') RETURNING expires_at`,
  [id, actor, surface, journeyId, subject ?? null, program.application.digest, lifetime]);
  return Object.freeze({ id, journeyId, expiresAt: row.expires_at.toISOString() as string });
}

export async function readJourney(client: PoolClient, program: LocalProgram, actor: string, surface: string, runId: string) {
  const run = await admittedRun(client, program, actor, surface, runId);
  const journey = program.journey(surface, run.journey);
  if (journey.kind !== "read") throw new Error("NOT_A_READ_JOURNEY");
  const records = run.subject ? [await ownedObject(client, program, actor, journey.object, run.subject)] :
    (await client.query<StoredObject>(`SELECT * FROM desert_objects
      WHERE object_type = $1 AND facts ->> $2 = $3 ORDER BY id`, [journey.object, program.owners.get(journey.object), actor])).rows;
  const fields = run.subject ? journey.fields : journey.collection;
  await requireLiveRun(client, run);
  return freezeDeep(records.flatMap(record => {
    if (!program.application.validate(journey.object, record.facts).valid) throw new Error("CORRUPT_OBJECT");
    if (!matchesConditions(record.facts, journey.where ?? {})) return [];
    return [{ id: record.id, version: record.version,
      facts: Object.fromEntries(fields.map(field => [field, record.facts[field]!])) }];
  }));
}
