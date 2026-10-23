import type { PoolClient } from "pg";
import { loadDefinition } from "../compiled-definition.ts";
import { admittedRun } from "../local/records.ts";
import type { LocalProgram } from "../local/program.ts";
import type { AssetScope } from "./records.ts";

export async function imageInputScope(client: PoolClient, program: LocalProgram, actor: string, surface: string,
  runId: string, inputField: string, storeId: string, allowExpired = false): Promise<AssetScope> {
  const run = await admittedRun(client, program, actor, surface, runId, allowExpired);
  const journey = program.journey(surface, run.journey);
  if (journey.kind !== "mutation") throw new Error("NOT_A_MUTATION_JOURNEY");
  const object = loadDefinition(program.application).objects.find(item => item.id === journey.command.object);
  const field=object?.facts[inputField];
  if (!journey.command.input.includes(inputField) || field?.kind !== "asset") throw new Error("INVALID_ASSET_INPUT");
  if (!allowExpired && run.state !== "admitted") throw new Error("INVALID_RUN_STATE");
  return { actor, surface, runId, inputField, storeId, contractDigest: program.application.digest,media:field.media };
}
