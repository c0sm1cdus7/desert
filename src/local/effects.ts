import { createHash } from "node:crypto";
import { jsonSnapshot, freezeDeep } from "../json.ts";
import type { LocalProgram } from "./program.ts";
import type { Effect, Facts, Intent, Mutation, Run, StoredObject } from "./types.ts";
import { matchesConditions } from "./conditions.ts";
import { InteractionProtocolVersion } from "../interaction/protocol.ts";

export function canonical(value: unknown) { return JSON.stringify(jsonSnapshot(value)); }
export function materialize(program: LocalProgram, journey: Mutation, actor: string, input: Facts,
  objectId: string, record?: StoredObject): Effect {
  const command = journey.command;
  if (!program.application.validateInput(command.id, input).valid) throw new Error("INVALID_INPUT");
  if (command.kind === "update") {
    if (!record) throw new Error("SUBJECT_REQUIRED");
    if (!matchesConditions(record.facts, command.when)) throw new Error("PRECONDITION_FAILED");
  }
  const expressions = command.kind === "create" ? command.values : command.set;
  const changes = Object.fromEntries(Object.entries(expressions).map(([field, expression]) => {
    const value = expression.kind === "actor" ? actor : expression.kind === "input" ? input[expression.field]! : expression.value;
    return [field, value];
  }));
  const facts = { ...(record?.facts ?? {}), ...changes };
  if (!program.application.validate(command.object, facts).valid) throw new Error("INVALID_EFFECT");
  return { kind: command.kind, objectType: command.object, objectId, expectedVersion: record?.version ?? 0, facts };
}

export function confirmationDigest(run: Run, input: Facts, effect: Effect) {
  return createHash("sha256").update(canonical({ runId: run.id, actor: run.actor, surface: run.surface,
    journey: run.journey, contractDigest: run.contract_digest, input, effect })).digest("hex");
}

export function preparedView(program: LocalProgram, run: Run, intent: Intent) {
  const owner = program.owners.get(intent.effect.objectType);
  const surface = program.application.surface(run.surface);
  const mutation = surface.journeys.find(journey => journey.id === run.journey);
  if (!owner || surface.protocol !== InteractionProtocolVersion || !mutation || mutation.kind !== "mutation"
    || mutation.object !== intent.effect.objectType || !Array.isArray(mutation.responseFields)
    || mutation.responseFields.some(field => typeof field !== "string")) {
    throw new Error("INVALID_PREPARED_PROJECTION");
  }
  const fields = new Set(mutation.responseFields);
  return freezeDeep({ id: intent.id, runId: run.id, journeyId: run.journey,
    object: { id: intent.effect.objectId, type: intent.effect.objectType, expectedVersion: intent.effect.expectedVersion },
    facts: Object.fromEntries(Object.entries(intent.effect.facts).filter(([name]) => name !== owner && fields.has(name))),
    confirmationDigest: intent.confirmation_digest });
}
