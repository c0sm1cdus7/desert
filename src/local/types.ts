import type { Static } from "@sinclair/typebox";
import type { JourneyDefinition } from "../program-grammar.ts";
import type { AssetEvidence } from "../assets/types.ts";
import type { intentsTable, receiptsTable, runsTable } from "../storage/tables/local.ts";

export type { Facts } from "../fact-values.ts";
import type { Facts } from "../fact-values.ts";
export type Mutation = Extract<JourneyDefinition, { kind: "mutation" }>;
/** An object read from its type's generated table (src/storage/object-store.ts). */
export type StoredObject = import("../storage/object-store.ts").ObjectRecord;
export type Run = Static<typeof runsTable.row>;
export type Effect = { kind: "create" | "update", objectType: string, objectId: string,
  expectedVersion: number, facts: Facts, assets?: readonly AssetEvidence[] };
export type Intent = Static<typeof intentsTable.row>;
export type ReceiptRow = Static<typeof receiptsTable.row>;
export type Receipt = { id: string, runId: string, commandId: string, status: "completed",
  object: { id: string, type: string, version: number } };

export function requireUUID(value: string) {
  if (typeof value !== "string" || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value)) {
    throw new Error("INVALID_REFERENCE");
  }
}
