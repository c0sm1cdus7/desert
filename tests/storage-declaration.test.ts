import test from "node:test";
import assert from "node:assert/strict";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { column, nullable } from "../src/storage/columns.ts";
import { declareStorage, defineTable, references } from "../src/storage/declare.ts";
import { controllerTables, executionTables, infrastructureTables } from "../src/storage/infrastructure.ts";
import type { Intent, Run, StoredObject, Effect, Facts } from "../src/local/types.ts";
import type { AssetRecord } from "../src/assets/records.ts";
import type { ActivityRecord } from "../src/activities/records.ts";
import type { JobRow, ExecutionResult } from "../src/execution/types.ts";
import type { PrivateAssetMetadata } from "../src/assets/types.ts";
import type { ActivityAnswers, ActivityPlan } from "../src/activities/schema.ts";
import type { PreflightOptions } from "../src/preflight.ts";

const closed = { additionalProperties: false } as const;
const rejects = (code: string, declare: () => unknown) =>
  assert.throws(declare, (error: unknown) => error instanceof Error && error.message.startsWith(`${code}: `));
const owners = () => defineTable({ name: "case_owners", row: Type.Object({ id: column.uuid(), label: column.text() }, closed), primaryKey: ["id"] });

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
// The derived row types keep the exact shape the hand-written types had at 53f9c47.
const runShape: Equal<Run, { id: string; actor: string; surface: string; journey: string; subject: string | null;
  contract_digest: string; expires_at: Date; state: "admitted" | "prepared" | "completed" }> = true;
const objectShape: Equal<StoredObject, { id: string; object_type: string; version: number; facts: Facts }> = true;
const intentShape: Equal<Intent, { id: string; run_id: string; input: Facts; effect: Effect; confirmation_digest: string }> = true;
const assetShape: Equal<AssetRecord, { id: string; actor: string; run_id: string; input_field: string; contract_digest: string;
  store_id: string; state: "reserved" | "uploading" | "ready" | "failed" | "attached"; declared_size: number;
  reserved_bytes: string; metadata: PrivateAssetMetadata | null }> = true;
const activityShape: Equal<ActivityRecord, { id: string; actor: string; surface: string; occurrence: string; request_digest: string;
  catalog_digest: string; plan_digest: string; plan: ActivityPlan; options: PreflightOptions; revision: number;
  answers: ActivityAnswers; completed: number[]; phase: "draft" | "prepared" | "completed" | "cancelled";
  intent_id: string | null; expires_at: Date; created_at: Date }> = true;
// JobRow now carries every column SELECT * returns; the hand-written type had dropped sequence, lease_until, created_at.
const jobShape: Equal<JobRow, { id: string; sequence: string; actor_id: string; submission_key: string; input: unknown;
  input_digest: string; state: "queued" | "leased" | "running" | "succeeded" | "failed" | "cancelled" | "uncertain";
  cancel_requested: boolean; claim_token: string | null; lease_until: Date | null; reason: string | null;
  result: ExecutionResult | null; created_at: Date }> = true;

// Slice 7.2 retired the generic desert_objects table and the desert_asset_links table that pointed into it: objects live
// in their generated per-type tables and an object's asset column is its link (src/storage/tables/assets.ts).
test("STORAGE_DECLARATION control: the infrastructure declares 15 tables, in order, in two installer groups", () => {
  assert.deepEqual([runShape, objectShape, intentShape, assetShape, activityShape, jobShape], [true, true, true, true, true, true]);
  assert.deepEqual(infrastructureTables.map(table => table.qualifiedName), [
    "desert_installation", "desert_identities", "desert_runs", "desert_intents", "desert_receipts",
    "desert_activities", "desert_activity_intents", "desert_identity_accounts", "desert_identity_sessions",
    "desert_asset_store", "desert_assets", "desert_execution.installation",
    "desert_execution.environments", "desert_execution.actors", "desert_execution.jobs",
  ]);
  assert.deepEqual([...controllerTables, ...executionTables], [...infrastructureTables]);
  assert.equal(infrastructureTables.some(table => /objects|asset_links/.test(table.name)), false);
});

test("STORAGE_DECLARATION control: a row is checked by the same schema the table declares", () => {
  const runs = infrastructureTables.find(table => table.qualifiedName === "desert_runs");
  assert.ok(runs);
  const row = { id: "00000000-0000-4000-8000-000000000001", actor: "00000000-0000-4000-8000-000000000002", surface: "human",
    journey: "create-note", subject: null, contract_digest: "a".repeat(64), expires_at: new Date(0), state: "admitted" };
  assert.equal(Value.Check(runs.row, row), true);
  assert.equal(Value.Check(runs.row, { ...row, state: "accepted" }), false);
});

test("STORAGE_DECLARATION: a property without a storage column is rejected", () => {
  rejects("STORAGE_DECLARATION", () => defineTable({ name: "case_raw", row: Type.Object({ id: Type.String() }, closed), primaryKey: ["id"] }));
});

test("STORAGE_DECLARATION: an open row (additional properties allowed) is rejected", () => {
  rejects("STORAGE_DECLARATION", () => defineTable({ name: "case_open", row: Type.Object({ id: column.uuid() }), primaryKey: ["id"] }));
});

test("STORAGE_DECLARATION: a name that is not a lower-case SQL identifier is rejected", () => {
  rejects("STORAGE_DECLARATION", () => defineTable({ name: "Case-Table", row: Type.Object({ id: column.uuid() }, closed), primaryKey: ["id"] }));
  rejects("STORAGE_DECLARATION", () => defineTable({ name: "case_column", row: Type.Object({ "Bad Name": column.uuid() }, closed), primaryKey: ["Bad Name"] }));
});

test("STORAGE_DECLARATION: a nullable primary key column is rejected", () => {
  rejects("STORAGE_DECLARATION", () => defineTable({ name: "case_null_key", row: Type.Object({ id: nullable(column.uuid()) }, closed), primaryKey: ["id"] }));
});

test("STORAGE_DECLARATION: a table without a primary key is rejected", () => {
  rejects("STORAGE_DECLARATION", () => defineTable({ name: "case_no_key", row: Type.Object({ id: column.uuid() }, closed), primaryKey: [] }));
});

test("STORAGE_DECLARATION: a foreign key whose column type differs from the referenced column is rejected", () => {
  const target = owners();
  rejects("STORAGE_DECLARATION", () => defineTable({ name: "case_wrong_type", row: Type.Object({ id: column.uuid(), owner: column.text() }, closed),
    primaryKey: ["id"], foreignKeys: [{ columns: ["owner"], references: references(target, "id") }] }));
});

test("STORAGE_DECLARATION: a foreign key that references columns which are not a key of the target is rejected", () => {
  const target = owners();
  rejects("STORAGE_DECLARATION", () => defineTable({ name: "case_not_key", row: Type.Object({ id: column.uuid(), label: column.text() }, closed),
    primaryKey: ["id"], foreignKeys: [{ columns: ["label"], references: references(target, "label") }] }));
});

test("STORAGE_DECLARATION: a partial index whose predicate is not a boolean column is rejected", () => {
  rejects("STORAGE_DECLARATION", () => defineTable({ name: "case_partial", row: Type.Object({ id: column.uuid(), label: column.text() }, closed),
    primaryKey: ["id"], indexes: [{ name: "case_partial_label", columns: ["label"], unique: true, where: "label" }] }));
});

test("STORAGE_DECLARATION: a declaration list with a duplicate table or a forward reference is rejected", () => {
  const target = owners();
  const child = defineTable({ name: "case_children", row: Type.Object({ id: column.uuid(), owner: column.uuid() }, closed),
    primaryKey: ["id"], foreignKeys: [{ columns: ["owner"], references: references(target, "id") }] });
  assert.deepEqual(declareStorage([target, child]).map(table => table.name), ["case_owners", "case_children"]);
  rejects("STORAGE_DECLARATION", () => declareStorage([child, target]));
  rejects("STORAGE_DECLARATION", () => declareStorage([target, owners()]));
});
