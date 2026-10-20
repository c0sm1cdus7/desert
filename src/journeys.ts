import type { ObjectDefinition } from "./contracts.ts";
import type { FieldKey } from "./authoring-types.ts";
import type { CommandDefinition } from "./program-grammar.ts";
import { requirementReferences, type ControllerDefinition, type RequirementsFor } from "./dependencies.ts";

export function mutationJourney<const Id extends string, const C extends CommandDefinition, const R extends ControllerDefinition>(
  id: Id, command: C, requires: RequirementsFor<NoInfer<C["object"]>, R>,
) {
  return { id, kind: "mutation" as const, command, requires: requirementReferences(requires),
    confirmation: "prepared-effect" as const, outcome: "receipt" as const };
}

export function readJourney<const Id extends string, const O extends ObjectDefinition, const R extends ControllerDefinition>(
  id: Id, object: O, definition: { fields: FieldKey<NoInfer<O>>[], collection: FieldKey<NoInfer<O>>[], requires: RequirementsFor<NoInfer<O["id"]>, R> },
) {
  return { id, kind: "read" as const, object: object.id as O["id"], ...definition, requires: requirementReferences(definition.requires) };
}

export function ownershipPolicy<const O extends ObjectDefinition>(object: O, field: {
  [K in FieldKey<NoInfer<O>>]: O["facts"][K] extends { kind: "principal" } ? K : never;
}[FieldKey<NoInfer<O>>]) {
  return { kind: "ownership" as const, object: object.id, field };
}
