import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Type } from "@sinclair/typebox";
import type { Pool } from "pg";
import { objectType, principal, text } from "../src/index.ts";
import { product } from "../src/contracts.ts";
import { clientInstallation, installationLanguage, masterKeyCustody } from "../src/storage/client-installation.ts";
import { column } from "../src/storage/columns.ts";
import { clientMarks, defineTable } from "../src/storage/declare.ts";
import { objectStorage } from "../src/storage/ddl.ts";
import { infrastructureTables } from "../src/storage/infrastructure.ts";
import { storedInstallations } from "../scripts/storage-products.ts";
import { SpanishClient, StorageKinds } from "./fixtures/storage-kinds.ts";
import { database, rejectsNamed, rowCount } from "./support/storage-database.ts";

// Owner answer Q4 (with Q47/Q48): one database per client — a full installation per client (server, database, master key,
// people). No row carries a client mark; a login is unique within its client.
const rejects = (code: string) => (error: unknown) => error instanceof Error && error.message.startsWith(`${code}: `);

const products = [StorageKinds, ...storedInstallations.flatMap(entry => entry.products)];

test("Q4: no infrastructure or object table has a client-mark column; every column traces to a declaration", () => {
  for (const table of infrastructureTables) assert.deepEqual(table.columns.map(entry => entry.name).filter(name => clientMarks.includes(name)), [], table.name);
  for (const definition of products) {
    const storage = objectStorage(definition, SpanishClient);
    for (const table of storage.tables) {
      const columns = table.columns.map(entry => entry.name);
      const owner = storage.objects.find(object => object.table === table);
      // An object table holds its key, its version and one column per scalar fact; a join table its three columns.
      assert.deepEqual(columns, owner ? ["id", "version", ...owner.columns] : ["object_id", "target_id", "position"], table.qualifiedName);
    }
  }
});

test("Q4 negative: a client mark is refused in an infrastructure table and in a product fact", () => {
  const marked = (name: string) => defineTable({ name: "case_rows", primaryKey: ["id"],
    row: Type.Object({ id: column.uuid(), [name]: column.uuid() }, { additionalProperties: false }) });
  assert.throws(() => marked("tenant_id"), rejects("STORAGE_DECLARATION"));
  assert.throws(() => marked("tenant"), rejects("STORAGE_DECLARATION"));
  assert.ok(marked("installation_label"), "control: other names are free");
  const Case = objectType({ id: "case", facts: { title: text(), owner: principal(), tenantId: text() } });
  const owned = product({ id: "case-product", objects: [Case], policies: [{ kind: "ownership", object: "case", field: "owner" }] });
  assert.throws(() => objectStorage(owned, SpanishClient), rejects("STORAGE_DECLARATION"));
});

async function account(pool: Pool, login: string) {
  const identity = randomUUID();
  await pool.query("INSERT INTO desert_identities (id, label, credential_hash, expires_at) VALUES ($1, $2, $3, now() + interval '1 day')", [identity, login, randomUUID()]);
  return pool.query("INSERT INTO desert_identity_accounts (identity_id, login, password_salt, password_hash) VALUES ($1, $2, 'salt', 'hash')", [identity, login]);
}

test("Q4 against PostgreSQL: two clients are two databases; one login exists once per client and never crosses clients", async () => {
  const [first, second] = [await database(StorageKinds), await database(StorageKinds)];
  await account(first, "ana");
  await account(second, "ana");
  await rejectsNamed(account(first, "ana"), "unique_violation", "desert_identity_accounts_login_key");
  await account(first, "bruno");
  assert.equal(await rowCount(first, "desert_identity_accounts"), 2);
  assert.equal(await rowCount(second, "desert_identity_accounts"), 1);
});

test("Q20 declaration: an installation declares its language; a missing, non-canonical or uncollatable tag is refused", () => {
  assert.deepEqual(clientInstallation({ language: "es-AR" }), { language: "es-AR" });
  assert.throws(() => clientInstallation({} as { language: string }), rejects("INSTALLATION_LANGUAGE"));
  for (const tag of ["", "es-ar", "xx", "not a tag"]) assert.throws(() => installationLanguage(tag), rejects("INSTALLATION_LANGUAGE"), tag);
});

test("Q50: each installation's master key has a copy on the platform and one in the owner's Keychain, where the first access code goes", () => {
  assert.deepEqual(masterKeyCustody, { copies: ["platform", "owner-keychain"], firstAccessCode: "owner-keychain" });
  assert.ok(Object.isFrozen(masterKeyCustody) && Object.isFrozen(masterKeyCustody.copies));
});
