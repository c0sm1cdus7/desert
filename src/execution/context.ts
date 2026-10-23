import type { PoolClient } from "pg";
import type { Database } from "../local/database.ts";
import { requireDurablePrimary } from "../local/installation.ts";
import type { FixedProcessAdapter, ExecutionActor, ExecutionEnvironment, ExecutionJob, ExecutionQueue } from "./types.ts";

export type QueueContext = {
  database: Database; leaseMs: number;
  environments: WeakSet<object>; actors: WeakMap<object, FixedProcessAdapter>;
  jobs: WeakSet<object>;
};
const queues = new WeakMap<object, QueueContext>();
export function registerQueue(queue: ExecutionQueue, context: QueueContext) { queues.set(queue, context); }
export function queueContext(queue: ExecutionQueue) {
  const context = queues.get(queue);
  if (!context) throw new Error("EXECUTION_QUEUE_REQUIRED");
  context.database.assertOpen();
  return context;
}
export function requireEnvironment(context: QueueContext, environment: ExecutionEnvironment) {
  if (!context.environments.has(environment)) throw new Error("EXECUTION_REFERENCE_REQUIRED");
}
export function requireActor(context: QueueContext, actor: ExecutionActor) {
  const adapter = context.actors.get(actor);
  if (!adapter) throw new Error("EXECUTION_REFERENCE_REQUIRED");
  return adapter;
}
export function requireJob(context: QueueContext, job: ExecutionJob) {
  if (!context.jobs.has(job)) throw new Error("EXECUTION_REFERENCE_REQUIRED");
}
export function issueJob(context: QueueContext, id: string): ExecutionJob {
  const job = Object.freeze({ id }) as ExecutionJob;
  context.jobs.add(job);
  return job;
}
export async function executionTransaction<T>(context: QueueContext, operation: (client: PoolClient) => Promise<T>) {
  try {
    return await context.database.transaction(async client => {
      await requireDurablePrimary(client);
      const { rows: [installation] } = await client.query("SELECT version FROM desert_execution.installation WHERE singleton FOR SHARE");
      if (installation?.version !== 1) throw new Error("EXECUTION_INSTALLATION_MISMATCH");
      return operation(client);
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("COMMIT_UNCERTAIN:")) {
      throw new Error("EXECUTION_COMMIT_UNCERTAIN: recover the original submission key or job; never create a replacement", { cause: error });
    }
    throw error;
  }
}
