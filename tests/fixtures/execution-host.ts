import { Type } from "@sinclair/typebox";
import { Pool } from "pg";
import { fileURLToPath } from "node:url";
import { postgresCluster } from "../../src/testing/postgres-cluster.ts";
import { fixedProcessAdapter, openExecutionQueue } from "../../src/execution.ts";

export const ExecutionInput = Type.Object({ message: Type.String({ maxLength: 200 }), mode: Type.Union([
  Type.Literal("echo"), Type.Literal("fail"), Type.Literal("wait"), Type.Literal("overflow"),
]) }, { additionalProperties: false });

export async function executionFixture() {
  const cluster = postgresCluster();
  const database = await cluster.database();
  const pool = new Pool({ host: database.socketDirectory, database: database.database, user: database.user });
  pool.on("error", () => {});
  const queue = await openExecutionQueue(database, { leaseMs: 3000 });
  const queues = [queue];
  const adapter = fixedProcessAdapter({ name: "deterministic-fixture", executable: process.execPath,
    arguments: [fileURLToPath(new URL("./execution-child.ts", import.meta.url))],
    workingDirectory: fileURLToPath(new URL("./", import.meta.url)), input: ExecutionInput,
    timeoutMs: 1000, maxOutputBytes: 1024 });
  const environment = await queue.registerEnvironment({ name: "fixture-local", label: "Fixture machine" });
  const actor = await queue.registerActor(environment, { name: "fixture", label: "Fixture actor", concurrency: 1, adapter });
  return { cluster, pool, queue, adapter, environment, actor, connection: database,
    async reopen() { const reopened = await openExecutionQueue(database); queues.push(reopened); return reopened; },
    async close() { cluster.start(); await Promise.all(queues.map(value => value.close())); await pool.end(); cluster.dispose(); } };
}
