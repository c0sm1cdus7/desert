import { randomUUID } from "node:crypto";
import type { TSchema } from "@sinclair/typebox";
import { requireAdapter, requireKeys, requireLabel, requireName, requireRange } from "./adapter.ts";
import { executionTransaction, requireEnvironment, type QueueContext } from "./context.ts";
import type { ExecutionActor, ExecutionEnvironment, FixedProcessAdapter } from "./types.ts";

export async function registerEnvironment(context: QueueContext, definition: { name: string; label: string }): Promise<ExecutionEnvironment> {
  requireKeys(definition, ["name", "label"]);
  requireName(definition.name); requireLabel(definition.label);
  const record = await executionTransaction(context, async client => {
    await client.query("INSERT INTO desert_execution.environments VALUES ($1,$2,$3) ON CONFLICT (name) DO NOTHING",
      [randomUUID(), definition.name, definition.label]);
    const { rows: [record] } = await client.query("SELECT * FROM desert_execution.environments WHERE name=$1", [definition.name]);
    if (record.label !== definition.label) throw new Error("EXECUTION_ENVIRONMENT_BINDING_CONFLICT");
    return record;
  });
  const reference = Object.freeze({ id: record.id, name: record.name, label: record.label }) as ExecutionEnvironment;
  context.environments.add(reference);
  return reference;
}

export async function registerActor<S extends TSchema>(context: QueueContext, environment: ExecutionEnvironment,
  definition: { name: string; label: string; concurrency: number; adapter: FixedProcessAdapter<S> }): Promise<ExecutionActor<S>> {
  requireEnvironment(context, environment);
  requireKeys(definition, ["name", "label", "concurrency", "adapter"]);
  requireName(definition.name); requireLabel(definition.label); requireRange(definition.concurrency, 1, 32);
  const adapter = requireAdapter(definition.adapter);
  const record = await executionTransaction(context, async client => {
    await client.query(`INSERT INTO desert_execution.actors VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (environment_id, name) DO NOTHING`,
    [randomUUID(), environment.id, definition.name, definition.label, adapter.digest, definition.concurrency]);
    const { rows: [record] } = await client.query(`SELECT * FROM desert_execution.actors WHERE environment_id=$1 AND name=$2`,
      [environment.id, definition.name]);
    if (record.label !== definition.label || record.concurrency !== definition.concurrency || record.adapter_digest !== adapter.digest) {
      throw new Error("EXECUTION_ACTOR_BINDING_CONFLICT");
    }
    return record;
  });
  const reference = Object.freeze({ id: record.id, name: record.name, label: record.label, environment }) as ExecutionActor<S>;
  context.actors.set(reference, definition.adapter);
  return reference;
}
