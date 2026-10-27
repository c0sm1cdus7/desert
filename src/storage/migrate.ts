// Law (plan §15, step 7.3; owner answer Q4): a client is one database, so a client is migrated alone. migrateClient runs
// the committed chain from the digest the client's database holds to the current one inside ONE transaction of that
// database, under the installer's lock, and records the new digest and the applied migration digests in
// desert_installation; any failure rolls the whole client back to the digest it held. migrateClients migrates clients one
// after another on their own connections: a failed client is reported and never stops, blocks or touches another.
// Raises INSTALLATION_MISMATCH.
import type { Pool } from "pg";
import { installedProblem, requireDurablePrimary, type InstalledRow } from "../local/installation.ts";
import type { ClientInstallation } from "./client-installation.ts";
import { chainPath, committedMigrations, type Migration } from "./migrations.ts";

/** The product, installation language and digest every client database must reach. */
export type MigrationTarget = Readonly<{ product: string; installation: ClientInstallation; digest: string }>;
export type ClientMigrated = Readonly<{ from: string; to: string; applied: readonly string[] }>;
export type ClientOutcome<C> = Readonly<{ client: C } & ({ migrated: ClientMigrated } | { failed: Error })>;

const mismatch = (what: string): never => {
  throw new Error(`INSTALLATION_MISMATCH: ${what}; contract: src/storage/migrate.ts`);
};

export async function migrateClient(pool: Pool, target: MigrationTarget, migrations: readonly Migration[] = committedMigrations()): Promise<ClientMigrated> {
  const client = await pool.connect();
  let broken = false;
  try {
    await client.query("BEGIN; SET LOCAL lock_timeout = '5s'; SET LOCAL synchronous_commit = on");
    await requireDurablePrimary(client);
    await client.query("SELECT pg_advisory_xact_lock(842721)");
    const { rows: [installed] } = await client.query<InstalledRow>("SELECT * FROM desert_installation FOR UPDATE");
    const problem = installedProblem(installed, target.product, migrations);
    if (problem !== undefined) mismatch(problem);
    const from = installed!.installation_digest;
    const path = chainPath(migrations, target.product, target.installation.language, from, target.digest) ??
      mismatch(`no committed migration chain leads from ${from} to ${target.digest}`);
    for (const step of path) await client.query(step.body);
    const applied = path.map(step => step.digest);
    if (applied.length) {
      await client.query("UPDATE desert_installation SET installation_digest = $1, migration_chain = migration_chain || $2::text[]", [target.digest, applied]);
    }
    await client.query("COMMIT");
    return Object.freeze({ from, to: target.digest, applied: Object.freeze(applied) });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => { broken = true; });
    throw error;
  } finally { client.release(broken); }
}

/** Every client in turn; each outcome is its own. */
export async function migrateClients<C>(clients: readonly Readonly<{ client: C; pool: Pool }>[], target: MigrationTarget,
  migrations: readonly Migration[] = committedMigrations()): Promise<readonly ClientOutcome<C>[]> {
  const outcomes: ClientOutcome<C>[] = [];
  for (const { client, pool } of clients) {
    try { outcomes.push({ client, migrated: await migrateClient(pool, target, migrations) }); } catch (error) {
      outcomes.push({ client, failed: error instanceof Error ? error : new Error(String(error)) });
    }
  }
  return outcomes;
}
