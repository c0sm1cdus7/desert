import type { PoolClient } from "pg";
import { freezeDeep } from "../json.ts";
import type { LocalProgram } from "./program.ts";
import { admittedRun, ownedObject, requireLiveRun } from "./records.ts";
import { canonical, confirmationDigest, materialize } from "./effects.ts";
import { requireUUID, type Intent, type Receipt } from "./types.ts";

async function loadIntent(client: PoolClient, program: LocalProgram, actor: string, surface: string, id: string) {
  requireUUID(id);
  const { rows: [intent] } = await client.query<Intent>(`SELECT i.* FROM desert_intents i
    JOIN desert_runs r ON i.run_id = r.id WHERE i.id = $1 AND r.actor = $2 AND r.surface = $3`, [id, actor, surface]);
  if (!intent) throw new Error("NOT_FOUND");
  const run = await admittedRun(client, program, actor, surface, intent.run_id, true);
  if (confirmationDigest(run, intent.input, intent.effect) !== intent.confirmation_digest) throw new Error("CORRUPT_INTENT");
  return { intent, run };
}

async function receipt(client: PoolClient, id: string) {
  const { rows: [row] } = await client.query<{ result: Receipt }>("SELECT result FROM desert_receipts WHERE intent_id = $1", [id]);
  return row ? freezeDeep(row.result) : null;
}

export async function recoverReceipt(client: PoolClient, program: LocalProgram, actor: string, surface: string, id: string) {
  await loadIntent(client, program, actor, surface, id);
  return receipt(client, id);
}

export async function acceptMutation(client: PoolClient, program: LocalProgram, actor: string,
  surface: string, id: string, expectedDigest: string) {
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
  const effect = materialize(program, journey, actor, intent.input, intent.effect.objectId, record);
  if (canonical(effect) !== canonical(intent.effect)) throw new Error("EFFECT_CHANGED");
  await requireLiveRun(client, run);
  const version = effect.expectedVersion + 1;
  if (effect.kind === "create") {
    await client.query("INSERT INTO desert_objects VALUES ($1, $2, $3, $4)",
      [effect.objectId, effect.objectType, version, JSON.stringify(effect.facts)]);
  } else {
    const updated = await client.query("UPDATE desert_objects SET version = $1, facts = $2 WHERE id = $3 AND version = $4",
      [version, JSON.stringify(effect.facts), effect.objectId, effect.expectedVersion]);
    if (updated.rowCount !== 1) throw new Error("VERSION_CONFLICT");
  }
  const result: Receipt = { id, runId: run.id, commandId: journey.command.id, status: "completed",
    object: { id: effect.objectId, type: effect.objectType, version } };
  await client.query("INSERT INTO desert_receipts (intent_id, result) VALUES ($1, $2)", [id, JSON.stringify(result)]);
  await client.query("UPDATE desert_runs SET state = 'completed' WHERE id = $1", [run.id]);
  return freezeDeep(result);
}
