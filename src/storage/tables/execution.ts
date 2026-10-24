// The execution queue: environments, actors and their jobs, in the desert_execution schema.
import { Type } from "@sinclair/typebox";
import type { ExecutionResult } from "../../execution/types.ts";
import { column, nullable } from "../columns.ts";
import { defineTable, references } from "../declare.ts";

const closed = { additionalProperties: false } as const;
const namespace = "desert_execution";

export const executionInstallationTable = defineTable({ namespace, name: "installation", primaryKey: ["singleton"],
  row: Type.Object({ singleton: column.singleton(), version: column.integer() }, closed) });

export const environmentsTable = defineTable({ namespace, name: "environments", primaryKey: ["id"], unique: [["name"]],
  row: Type.Object({ id: column.uuid(), name: column.text(), label: column.text() }, closed) });

export const actorsTable = defineTable({ namespace, name: "actors", primaryKey: ["id"], unique: [["environment_id", "name"]],
  foreignKeys: [{ columns: ["environment_id"], references: references(environmentsTable, "id") }], row: Type.Object({
    id: column.uuid(), environment_id: column.uuid(), name: column.text(), label: column.text(), adapter_digest: column.text(),
    concurrency: column.integer({ minimum: 1, maximum: 32 }),
  }, closed) });

export const jobsTable = defineTable({ namespace, name: "jobs", primaryKey: ["id"], unique: [["sequence"], ["actor_id", "submission_key"]],
  foreignKeys: [{ columns: ["actor_id"], references: references(actorsTable, "id") }],
  indexes: [{ name: "jobs_by_actor_state", columns: ["actor_id", "state", "sequence"] }],
  row: Type.Object({
    // The input is checked against the actor's adapter schema (src/execution/jobs.ts) before it is written.
    id: column.uuid(), sequence: column.identity(), actor_id: column.uuid(), submission_key: column.text(), input: column.json(Type.Unknown()),
    input_digest: column.text(), state: column.oneOf(["queued", "leased", "running", "succeeded", "failed", "cancelled", "uncertain"]),
    cancel_requested: column.boolean(false), claim_token: nullable(column.uuid()), lease_until: nullable(column.timestamp()),
    reason: nullable(column.text()), result: nullable(column.json(Type.Unsafe<ExecutionResult>({}))),
    created_at: column.timestamp("clock_timestamp"),
  }, closed) });
