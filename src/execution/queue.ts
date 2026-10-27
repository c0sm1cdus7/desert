import { renderExecutionDdl } from "../storage/render-ddl.ts";
import { localDatabase, type LocalDatabase } from "../local/database.ts";
import { requireDurablePrimary } from "../local/installation.ts";
import { registerActor, registerEnvironment } from "./bindings.ts";
import { requireKeys, requireRange } from "./adapter.ts";
import { registerQueue, type QueueContext } from "./context.ts";
import { cancel, enqueue, inspect, jobs, lookup } from "./jobs.ts";
import type { ExecutionQueue } from "./types.ts";

export async function openExecutionQueue(connection: LocalDatabase, options: { leaseMs?: number } = {}): Promise<ExecutionQueue> {
  requireKeys(options, ["leaseMs"]);
  const leaseMs = options.leaseMs ?? 10000;
  requireRange(leaseMs, 1000, 60000);
  const database = localDatabase(connection);
  try {
    await database.transaction(async client => {
      await requireDurablePrimary(client);
      await client.query("SELECT pg_advisory_xact_lock(842724)");
      await client.query(renderExecutionDdl());
      await client.query("INSERT INTO desert_execution.installation VALUES (true, 1) ON CONFLICT DO NOTHING");
      const { rows: [installed] } = await client.query("SELECT version FROM desert_execution.installation WHERE singleton");
      if (installed?.version !== 1) throw new Error("EXECUTION_INSTALLATION_MISMATCH");
    });
    const context: QueueContext = { database, leaseMs, environments: new WeakSet(), actors: new WeakMap(), jobs: new WeakSet() };
    const queue: ExecutionQueue = Object.freeze({
      registerEnvironment: definition => registerEnvironment(context, definition),
      registerActor: (environment, definition) => registerActor(context, environment, definition),
      enqueue: (actor, submission) => enqueue(context, actor, submission),
      lookup: (actor, key) => lookup(context, actor, key),
      jobs: actor => jobs(context, actor),
      inspect: job => inspect(context, job),
      cancel: job => cancel(context, job),
      close: () => database.close(),
    });
    registerQueue(queue, context);
    return queue;
  } catch (error) { await database.close(); throw error; }
}
