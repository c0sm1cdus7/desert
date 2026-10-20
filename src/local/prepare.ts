import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { LocalProgram } from "./program.ts";
import { admittedRun, ownedObject, requireLiveRun } from "./records.ts";
import { canonical, confirmationDigest, materialize, preparedView } from "./effects.ts";
import type { Facts, Intent } from "./types.ts";

export async function prepareMutation(client: PoolClient, program: LocalProgram, actor: string,
  surface: string, runId: string, input: unknown) {
  const run = await admittedRun(client, program, actor, surface, runId);
  const journey = program.journey(surface, run.journey);
  if (journey.kind !== "mutation") throw new Error("NOT_A_MUTATION_JOURNEY");
  if (!program.application.validateInput(journey.command.id, input).valid) throw new Error("INVALID_INPUT");
  const values = input as Facts;
  const { rows: [existing] } = await client.query<Intent>("SELECT * FROM desert_intents WHERE run_id = $1", [run.id]);
  if (existing) {
    if (canonical(existing.input) !== canonical(values)) throw new Error("INTENT_CONFLICT");
    return preparedView(program, run, existing);
  }
  if (run.state !== "admitted") throw new Error("INVALID_RUN_STATE");
  const record = journey.command.kind === "update"
    ? await ownedObject(client, program, actor, journey.command.object, run.subject!) : undefined;
  const effect = materialize(program, journey, actor, values, record?.id ?? randomUUID(), record);
  const intent: Intent = { id: randomUUID(), run_id: run.id, input: values, effect,
    confirmation_digest: confirmationDigest(run, values, effect) };
  await requireLiveRun(client, run);
  await client.query("INSERT INTO desert_intents VALUES ($1, $2, $3, $4, $5)",
    [intent.id, run.id, JSON.stringify(values), JSON.stringify(effect), intent.confirmation_digest]);
  await client.query("UPDATE desert_runs SET state = 'prepared' WHERE id = $1", [run.id]);
  return preparedView(program, run, intent);
}
