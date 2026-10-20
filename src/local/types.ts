import type { JourneyDefinition } from "../program-grammar.ts";

export type Facts = Record<string, string | number>;
export type Mutation = Extract<JourneyDefinition, { kind: "mutation" }>;
export type StoredObject = { id: string, object_type: string, version: number, facts: Facts };
export type Run = { id: string, actor: string, surface: string, journey: string, subject: string | null,
  contract_digest: string, expires_at: Date, state: "admitted" | "prepared" | "completed" };
export type Effect = { kind: "create" | "update", objectType: string, objectId: string,
  expectedVersion: number, facts: Facts };
export type Intent = { id: string, run_id: string, input: Facts, effect: Effect, confirmation_digest: string };
export type Receipt = { id: string, runId: string, commandId: string, status: "completed",
  object: { id: string, type: string, version: number } };

export function requireUUID(value: string) {
  if (typeof value !== "string" || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value)) {
    throw new Error("INVALID_REFERENCE");
  }
}
