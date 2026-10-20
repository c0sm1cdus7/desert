import type { PoolClient } from "pg";
import type { LocalProgram } from "./program.ts";
import { ownedObject } from "./records.ts";
import { matchesConditions } from "./conditions.ts";

export async function inspectOffer(client: PoolClient, program: LocalProgram, actor: string,
  surface: string, journeyId: string, subject: string) {
  const journey = program.journey(surface, journeyId);
  if (journey.kind !== "mutation" || journey.command.kind !== "update") throw new Error("NOT_A_SUBJECT_ACTION");
  const record = await ownedObject(client, program, actor, journey.command.object, subject);
  return Object.freeze({ journeyId, subject, version: record.version,
    eligible: matchesConditions(record.facts, journey.command.when) });
}
