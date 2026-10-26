import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { compile } from "../src/compile.ts";
import { clientInstallation } from "../src/storage/client-installation.ts";
import { objectDdlPath, renderObjectDdl } from "../src/storage/ddl.ts";
import { renderInfrastructureDdl } from "../src/storage/render-ddl.ts";
import { SpanishClient, StorageKinds } from "./fixtures/storage-kinds.ts";
import { database, schema, seed } from "./support/storage-database.ts";

// Owner answer Q20: text orders by the ICU collation of the installation's declared language, and search ignores accents
// through `unaccent`, created by the generated DDL in every client database.
const English = clientInstallation({ language: "en" });

test("Q20: the generated DDL creates unaccent per database, the language's ICU collation per product schema, and collates text facts", () => {
  const infrastructure = renderInfrastructureDdl();
  assert.ok(infrastructure.includes(`CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA "public";\n`));
  assert.ok(infrastructure.includes(`CREATE OR REPLACE FUNCTION "public"."desert_search_key"(value text) RETURNS text`));
  const ddl = renderObjectDdl(StorageKinds, SpanishClient);
  assert.ok(ddl.includes(`CREATE COLLATION "${schema}"."desert_language" (provider = icu, locale = 'es');`));
  assert.ok(ddl.includes(`  "title" text COLLATE "${schema}"."desert_language" NOT NULL CHECK (char_length("title") BETWEEN 1 AND 8),\n`));
  assert.ok(ddl.includes(`  "tags" text[] COLLATE "${schema}"."desert_language" NOT NULL CHECK (`));
  assert.ok(ddl.includes(`  "status" text NOT NULL CHECK ("status" IN ('open', 'done')),\n`), "an enum orders by declaration, not by language");
  assert.ok(renderObjectDdl(StorageKinds, English).includes(`(provider = icu, locale = 'en');`));
  assert.equal(objectDdlPath(StorageKinds, SpanishClient), `src/storage/generated/storage-kinds.es.${compile(StorageKinds).digest}.sql`);
});

test("Q20 against PostgreSQL: Spanish order puts accented and ñ words where a reader expects them; C order does not", async () => {
  const pool = await database(StorageKinds);
  const { owner } = await seed(pool);
  const names = ["Zeta", "árbol", "Avión", "ñandú", "nube", "Home2"];
  for (const name of names) await pool.query(`INSERT INTO ${schema}.project (id, version, name, color, owner) VALUES ($1, 1, $2, 'blue', $3)`, [randomUUID(), name, owner]);
  const ordered = async (collate: string) => (await pool.query<{ name: string }>(`SELECT name FROM ${schema}.project ORDER BY name${collate}, id`)).rows.map(row => row.name);
  assert.deepEqual(await ordered(""), ["árbol", "Avión", "Home", "Home2", "nube", "ñandú", "Zeta"]);
  assert.deepEqual(await ordered(` COLLATE "C"`), ["Avión", "Home", "Home2", "Zeta", "nube", "árbol", "ñandú"], "control: the byte order differs");
});

test("Q20 against PostgreSQL: the search key ignores accents and case", async () => {
  const pool = await database(StorageKinds);
  const key = async (value: string) => (await pool.query<{ key: string }>("SELECT public.desert_search_key($1) AS key", [value])).rows[0]?.key;
  assert.equal(await key("Canción ÁRBOL Ñandú"), "cancion arbol nandu");
  assert.equal(await key("cancion"), await key("Canción"));
  assert.notEqual(await key("cancion"), await key("camion"), "control: different words keep different keys");
});

test("Q20 negative: installing the same product in another language over an existing database fails loud, never keeps the old order", async () => {
  const pool = await database(StorageKinds);
  await assert.rejects(pool.query(renderObjectDdl(StorageKinds, English)), /INSTALLATION_LANGUAGE: product_storage_kinds\.desert_language is not en/);
  await assert.doesNotReject(pool.query(renderObjectDdl(StorageKinds, SpanishClient)), "control: the declared language reapplies");
});
