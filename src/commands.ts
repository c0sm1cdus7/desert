import type { ObjectDefinition } from "./contracts.ts";
import type { ChangeValues, Conditions, CreateValues, WritableKey } from "./authoring-types.ts";

export function fromInput<const K extends string>(field: K) { return { kind: "input" as const, field }; }
export function literal<const V extends string | number | []>(value: V) { return { kind: "literal" as const, value }; }
export function actorId() { return { kind: "actor" as const }; }

export function createCommand<const Id extends string, const O extends ObjectDefinition, const K extends WritableKey<O>[]>(
  id: Id, object: O, definition: { input: K, values: CreateValues<NoInfer<O>, NoInfer<K[number]>> },
) {
  return { id, kind: "create" as const, object: object.id as O["id"], ...definition };
}

export function updateCommand<const Id extends string, const O extends ObjectDefinition, const K extends WritableKey<O>[]>(
  id: Id, object: O, definition: {
    input: K, when: Conditions<NoInfer<O>>, set: ChangeValues<NoInfer<O>, NoInfer<K[number]>>,
  },
) {
  return { id, kind: "update" as const, object: object.id as O["id"], ...definition };
}
