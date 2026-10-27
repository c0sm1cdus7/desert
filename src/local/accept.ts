import type { PoolClient } from "pg";
import { freezeDeep } from "../json.ts";
import type { LocalProgram } from "./program.ts";
import { admittedRun, ownedObject, requireLiveRun } from "./records.ts";
import { canonical, confirmationDigest, materialize } from "./effects.ts";
import { requireUUID, type Effect, type Intent, type Mutation, type Receipt, type ReceiptRow } from "./types.ts";
import { applyChangesIn, type Change } from "../storage/change-set.ts";
import { namingViolations } from "../storage/violations.ts";
import { requireCurrentActivityIntent, completeActivityIntent } from "../activities/acceptance.ts";
import type { ActivityIndex } from "../activities/activity-index.ts";
import { bindImageEffect, attachImageEffect } from "../assets/acceptance.ts";
import { validateReferences } from './reference-validation.ts';

export async function loadIntent(client: PoolClient, program: LocalProgram, actor: string, surface: string, id: string) {
  requireUUID(id);
  const { rows: [intent] } = await client.query<Intent>(`SELECT i.* FROM desert_intents i
    JOIN desert_runs r ON i.run_id = r.id WHERE i.id = $1 AND r.actor = $2 AND r.surface = $3`, [id, actor, surface]);
  if (!intent) throw new Error("NOT_FOUND");
  const run = await admittedRun(client, program, actor, surface, intent.run_id, true);
  if (confirmationDigest(run, intent.input, intent.effect) !== intent.confirmation_digest) throw new Error("CORRUPT_INTENT");
  return { intent, run };
}

/** The accepted effect as one change of the journey's module (owner answer Q3), written to the object's generated table.
 * The prepared effect is what was confirmed, so an update writes every fact of it, preserved ones included: a corrupted
 * preservation reaches storage and is caught (tests/verification-mutations.test.ts), never silently masked by the row.
 * Postgres re-checks the declaration: a violation is a named code. */
export async function writeEffect(client: PoolClient, program: LocalProgram, journey: Mutation, effect: Effect): Promise<number> {
  const change: Change = effect.kind === "create"
    ? { kind: "create", object: effect.objectType, id: effect.objectId, facts: effect.facts }
    : { kind: "update", object: effect.objectType, id: effect.objectId, expectedVersion: effect.expectedVersion, set: effect.facts };
  try {
    const { objects: [written] } = await namingViolations(() => applyChangesIn(client, program.module(journey), [change]));
    if (!written) throw new Error("EFFECT_LIMIT");
    return written.version;
  } catch (error) {
    // A stale or missing subject is the same refusal the subject's own read gives; the detail is for the log.
    const code = error instanceof Error ? /^(VERSION_CONFLICT|NOT_FOUND): /.exec(error.message)?.[1] : undefined;
    throw code ? new Error(code, { cause: error }) : error;
  }
}

async function receipt(client: PoolClient, id: string) {
  const { rows: [row] } = await client.query<Pick<ReceiptRow, "result">>("SELECT result FROM desert_receipts WHERE intent_id = $1", [id]);
  return row ? freezeDeep(row.result) : null;
}

export async function recoverReceipt(client: PoolClient, program: LocalProgram, actor: string, surface: string, id: string) {
  await loadIntent(client, program, actor, surface, id);
  return receipt(client, id);
}

export async function acceptMutation(client: PoolClient, program: LocalProgram, actor: string,
  surface: string, id: string, expectedDigest: string, activities?: ActivityIndex, imageStoreId?: string) {
  await requireCurrentActivityIntent(client, id, actor, surface, activities);
  const { intent, run } = await loadIntent(client, program, actor, surface, id);
  if (expectedDigest !== intent.confirmation_digest) throw new Error("CONFIRMATION_MISMATCH");
  const existing = await receipt(client, id);
  if (existing) return existing;
  await requireLiveRun(client, run);
  if (run.state !== "prepared") throw new Error("INVALID_RUN_STATE");
  const journey = program.journey(surface, run.journey);
  if (journey.kind !== "mutation") throw new Error("NOT_A_MUTATION_JOURNEY");
  const record = journey.command.kind === "update"
    ? await ownedObject(client, program, actor, journey.command.object, run.subject!) : undefined;
  if ((record?.version ?? 0) !== intent.effect.expectedVersion) throw new Error("VERSION_CONFLICT");
  const effect = await bindImageEffect(client, program, run, journey, intent.input,
    materialize(program, journey, actor, intent.input, intent.effect.objectId, record), imageStoreId);
  if (canonical(effect) !== canonical(intent.effect)) throw new Error("EFFECT_CHANGED");
  await validateReferences(client,program,actor,effect.objectType,effect.facts,effect.objectId);
  await requireLiveRun(client, run);
  const version = await writeEffect(client, program, journey, effect);
  await attachImageEffect(client, effect);
  const result: Receipt = { id, runId: run.id, commandId: journey.command.id, status: "completed",
    object: { id: effect.objectId, type: effect.objectType, version } };
  await client.query("INSERT INTO desert_receipts (intent_id, result) VALUES ($1, $2)", [id, JSON.stringify(result)]);
  await client.query("UPDATE desert_runs SET state = 'completed' WHERE id = $1", [run.id]);
  await completeActivityIntent(client, id);
  return freezeDeep(result);
}
