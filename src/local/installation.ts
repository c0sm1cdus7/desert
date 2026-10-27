import type { Static } from "@sinclair/typebox";
import type { PoolClient } from "pg";
import { chainLeadsTo, committedMigrations, type Migration } from "../storage/migrations.ts";
import { infrastructureDigest } from "../storage/render-ddl.ts";
import type { installationTable } from "../storage/tables/local.ts";

export type Installation = { product: string, digest: string, roles: readonly string[] };
export type InstalledRow = Static<typeof installationTable.row>;

export async function requireDurablePrimary(client: PoolClient) {
  const { rows: [settings] } = await client.query(`SELECT current_setting('fsync') AS fsync,
    current_setting('full_page_writes') AS full_page_writes, pg_is_in_recovery() AS recovery,
    current_setting('default_transaction_read_only') AS read_only`);
  if (settings.fsync !== "on" || settings.full_page_writes !== "on" || settings.recovery || settings.read_only !== "off") {
    throw new Error("DURABLE_PRIMARY_REQUIRED");
  }
}

/** Why an installed row cannot serve `product` at all, whatever digest it holds: another product, other infrastructure, or
 * a migration chain that does not lead to its own digest (an edited or unknown migration). */
export function installedProblem(installed: InstalledRow | undefined, product: string, migrations: readonly Migration[]): string | undefined {
  if (!installed) return "the database holds no installation";
  if (installed.product_id !== product) return `the database holds product ${installed.product_id}`;
  if (installed.infrastructure_digest !== infrastructureDigest()) return "the database was built from other infrastructure tables";
  if (!chainLeadsTo(migrations, product, installed.migration_chain, installed.installation_digest)) {
    return "its migration chain does not lead to its digest through committed migrations";
  }
  return undefined;
}

/** A fresh install records the digest its tables were created at and an empty chain. */
export async function recordInstallation(client: PoolClient, installation: Installation) {
  await client.query(`INSERT INTO desert_installation (singleton, product_id, installation_digest, migration_chain, infrastructure_digest, controller_roles)
    VALUES (true, $1, $2, '{}', $3, $4) ON CONFLICT DO NOTHING`, [installation.product, installation.digest, infrastructureDigest(), installation.roles]);
}

/** INSTALLATION_MISMATCH: an installation serves only when its chain leads to the current digest (plan §15, step 7.3). */
export async function requireInstallation(client: PoolClient, expected: Installation, lock = true) {
  await requireDurablePrimary(client);
  const { rows: [installed] } = await client.query<InstalledRow>(`SELECT * FROM desert_installation${lock ? " FOR SHARE" : ""}`);
  if (installedProblem(installed, expected.product, committedMigrations()) !== undefined || installed!.installation_digest !== expected.digest ||
    JSON.stringify(installed!.controller_roles) !== JSON.stringify(expected.roles)) {
    throw new Error("INSTALLATION_MISMATCH");
  }
}
