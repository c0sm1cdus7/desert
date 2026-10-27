// The controller's own rows: installation, identities and the begin → prepare → accept ledger. A product's objects live
// in their own generated tables (src/storage/ddl.ts), never in an infrastructure table.
import { Type } from "@sinclair/typebox";
import { FactValueSchema } from "../../fact-values.ts";
import type { Effect, Facts, Receipt } from "../../local/types.ts";
import { column, nullable } from "../columns.ts";
import { defineTable, references } from "../declare.ts";

const closed = { additionalProperties: false } as const;
const facts = Type.Unsafe<Facts>(Type.Record(Type.String(), FactValueSchema));

export const installationTable = defineTable({ name: "desert_installation", primaryKey: ["singleton"], row: Type.Object({
  singleton: column.singleton(true), schema_version: column.integer(), product_id: column.text(),
  contract_digest: column.text(), controller_roles: column.textArray(),
}, closed) });

export const identitiesTable = defineTable({ name: "desert_identities", primaryKey: ["id"], unique: [["credential_hash"]], row: Type.Object({
  id: column.uuid(), label: column.text(), credential_hash: column.text(), revoked: column.boolean(false), expires_at: column.timestamp(),
}, closed) });

export const runsTable = defineTable({ name: "desert_runs", primaryKey: ["id"],
  foreignKeys: [{ columns: ["actor"], references: references(identitiesTable, "id") }], row: Type.Object({
    id: column.uuid(), actor: column.uuid(), surface: column.text(), journey: column.text(), subject: nullable(column.uuid()),
    contract_digest: column.text(), expires_at: column.timestamp(), state: column.oneOf(["admitted", "prepared", "completed"]),
  }, closed) });

export const intentsTable = defineTable({ name: "desert_intents", primaryKey: ["id"], unique: [["run_id"]],
  foreignKeys: [{ columns: ["run_id"], references: references(runsTable, "id") }], row: Type.Object({
    id: column.uuid(), run_id: column.uuid(), input: column.json(facts),
    // The effect is computed and re-checked by src/local/effects.ts; storage carries its static type only.
    effect: column.json(Type.Unsafe<Effect>({})), confirmation_digest: column.text(),
  }, closed) });

export const receiptsTable = defineTable({ name: "desert_receipts", primaryKey: ["intent_id"],
  foreignKeys: [{ columns: ["intent_id"], references: references(intentsTable, "id") }], row: Type.Object({
    intent_id: column.uuid(), result: column.json(Type.Unsafe<Receipt>({})), accepted_at: column.timestamp("clock_timestamp"),
  }, closed) });
