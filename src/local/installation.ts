import type { PoolClient } from "pg";

export type Installation = { product: string, digest: string, role: string };

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
  const { rows: [installed] } = await client.query(`SELECT * FROM desert_installation${lock ? " FOR SHARE" : ""}`);
  if (!installed || installed.schema_version !== 1 || installed.product_id !== expected.product ||
    installed.contract_digest !== expected.digest || installed.controller_role !== expected.role) {
    throw new Error("INSTALLATION_MISMATCH");
  }
}
