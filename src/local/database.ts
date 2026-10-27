import { readFileSync, statSync } from "node:fs";
import { isAbsolute } from "node:path";
import { Pool, type PoolClient } from "pg";
import { recordInstallation, requireDurablePrimary, requireInstallation } from "./installation.ts";

export type LocalDatabase = { socketDirectory: string, database: string, user: string, port?: number };

export function localDatabase(options: LocalDatabase) {
  if (!isAbsolute(options.socketDirectory)) throw new Error("LOCAL_SOCKET_REQUIRED");
  const socket = statSync(options.socketDirectory);
  if (!socket.isDirectory() || socket.uid !== process.getuid?.() || (socket.mode & 0o077)) {
    throw new Error("PRIVATE_SOCKET_REQUIRED");
  }
  const pool = new Pool({ host: options.socketDirectory, database: options.database, user: options.user,
    port: options.port ?? 5432, max: 8, connectionTimeoutMillis: 5000 });
  const faults = new Set<(error: unknown) => void>();
  const closing = new Set<() => void>();
  let closed = false;
  let completion: Promise<void> | undefined;
  const assertOpen = () => { if (closed) throw new Error("CONTROLLER_CLOSED"); };
  const notifyFault = (error: unknown) => { for (const listener of faults) listener(error); };
  const clientFaults = new WeakMap<PoolClient, unknown>();
  function recordFault(client: PoolClient, error: unknown) {
    if (clientFaults.has(client)) return;
    clientFaults.set(client, error);
    notifyFault(error);
  }
  // Pool checkout removes its idle listener before the awaiting caller resumes.
  pool.on("connect", client => { client.on("error", error => recordFault(client, error)); });
  pool.on("error", (error, client) => recordFault(client, error));
  const requireHealthy = (client: PoolClient) => {
    if (clientFaults.has(client)) throw clientFaults.get(client);
  };

  async function transaction<T>(operation: (client: PoolClient) => Promise<T>, readOnly = false): Promise<T> {
    assertOpen();
    const client = await pool.connect();
    let committing = false;
    let broken = false;
    try {
      assertOpen();
      requireHealthy(client);
      await client.query(readOnly
        ? "BEGIN READ ONLY; SET LOCAL lock_timeout = '1s'; SET LOCAL statement_timeout = '1s'"
        : "BEGIN; SET LOCAL lock_timeout = '5s'; SET LOCAL statement_timeout = '15s'; SET LOCAL synchronous_commit = on");
      const result = await operation(client);
      requireHealthy(client);
      committing = true;
      await client.query("COMMIT");
      return result;
    } catch (error) {
      if (!clientFaults.has(client)) await client.query("ROLLBACK").catch(() => { broken = true; });
      if (committing && !readOnly) throw new Error("COMMIT_UNCERTAIN: recover the original intent receipt", { cause: error });
      throw error;
    } finally { client.release(broken || clientFaults.has(client)); }
  }

  async function install(product: string, digest: string, roles: readonly string[]) {
    await transaction(async client => {
      await requireDurablePrimary(client);
      await client.query("SELECT pg_advisory_xact_lock(842721)");
      await client.query(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
      await client.query(readFileSync(new URL("../activities/schema.sql", import.meta.url), "utf8"));
      await client.query(readFileSync(new URL("../identity/schema.sql", import.meta.url), "utf8"));
      await recordInstallation(client, { product, digest, roles });
      await requireInstallation(client, { product, digest, roles });
    });
  }
  return { transaction, install, assertOpen,
    onFault(listener: (error: unknown) => void) { assertOpen(); faults.add(listener); return () => { faults.delete(listener); }; },
    onClose(listener: () => void) { assertOpen(); closing.add(listener); return () => { closing.delete(listener); }; },
    close() {
      if (!closed) {
        closed = true;
        for (const listener of closing) listener();
        closing.clear();
        faults.clear();
        completion = pool.end();
      }
      return completion!;
    },
  };
}
export type Database = ReturnType<typeof localDatabase>;
