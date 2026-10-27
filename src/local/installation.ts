import type { Static } from "@sinclair/typebox";
import type { PoolClient } from "pg";
import type { installationTable } from "../storage/tables/local.ts";

export type Installation = { product: string, digest: string, roles: readonly string[] };
/** 5: objects live in their generated per-type tables (plan §15, step 7.2); a version-4 database holds them in the
 * retired generic table and is refused (INSTALLATION_MISMATCH), never served as if it were empty. */
export const LocalSchemaVersion = 5;

export async function requireDurablePrimary(client: PoolClient) {
  const { rows: [settings] } = await client.query(`SELECT current_setting('fsync') AS fsync,
    current_setting('full_page_writes') AS full_page_writes, pg_is_in_recovery() AS recovery,
    current_setting('default_transaction_read_only') AS read_only`);
  if (settings.fsync !== "on" || settings.full_page_writes !== "on" || settings.recovery || settings.read_only !== "off") {
    throw new Error("DURABLE_PRIMARY_REQUIRED");
  }
}

export async function requireInstallation(client: PoolClient, expected: Installation, lock = true) {
  await requireDurablePrimary(client);
  const { rows: [installed] } = await client.query<Static<typeof installationTable.row>>(`SELECT * FROM desert_installation${lock ? " FOR SHARE" : ""}`);
  if (!installed || installed.schema_version !== LocalSchemaVersion || installed.product_id !== expected.product ||
    installed.contract_digest !== expected.digest || JSON.stringify(installed.controller_roles) !== JSON.stringify(expected.roles)) {
    throw new Error("INSTALLATION_MISMATCH");
  }
}
