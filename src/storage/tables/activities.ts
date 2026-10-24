// Activity drafts and the intents they prepared.
import { Type } from "@sinclair/typebox";
import { ActivityPlanSchema, type ActivityAnswers, type ActivityPlan } from "../../activities/schema.ts";
import { PreflightOptionsSchema, type PreflightOptions } from "../../preflight.ts";
import { column, nullable } from "../columns.ts";
import { defineTable, references } from "../declare.ts";
import { identitiesTable, intentsTable } from "./local.ts";

const closed = { additionalProperties: false } as const;

export const activitiesTable = defineTable({ name: "desert_activities", primaryKey: ["id"], unique: [["actor", "surface", "occurrence"]],
  foreignKeys: [
    { columns: ["actor"], references: references(identitiesTable, "id") },
    { columns: ["intent_id"], references: references(intentsTable, "id") },
  ], row: Type.Object({
    id: column.uuid(), actor: column.uuid(), surface: column.text(), occurrence: column.uuid(),
    request_digest: column.text(), catalog_digest: column.text(), plan_digest: column.text(),
    plan: column.json(Type.Unsafe<ActivityPlan>(ActivityPlanSchema)),
    options: column.json(Type.Unsafe<PreflightOptions>(PreflightOptionsSchema)),
    revision: column.integer({ exclusiveMinimum: 0 }),
    // Answers are validated against the plan by src/activities/answer-validation.ts.
    answers: column.json(Type.Unsafe<ActivityAnswers>({})), completed: column.json(Type.Array(Type.Integer())),
    phase: column.oneOf(["draft", "prepared", "completed", "cancelled"]), intent_id: nullable(column.uuid()),
    expires_at: column.timestamp(), created_at: column.timestamp("clock_timestamp"),
  }, closed) });

export const activityIntentsTable = defineTable({ name: "desert_activity_intents", primaryKey: ["intent_id"],
  foreignKeys: [
    { columns: ["intent_id"], references: references(intentsTable, "id") },
    { columns: ["activity_id"], references: references(activitiesTable, "id") },
  ], row: Type.Object({ intent_id: column.uuid(), activity_id: column.uuid(), revision: column.integer() }, closed) });
