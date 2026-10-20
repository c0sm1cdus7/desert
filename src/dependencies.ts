import { Type, type Static } from "@sinclair/typebox";
import type { ObjectDefinition } from "./contracts.ts";

const Name = Type.String({ minLength: 1 });
const Names = Type.Array(Name, { uniqueItems: true });
const closed = { additionalProperties: false };
export const DependencySchema = Type.Union([
  Type.Object({ id: Name, kind: Type.Literal("controller"), objects: Type.Array(Name, { minItems: 1, uniqueItems: true }), requires: Names }, closed),
  Type.Object({ id: Name, kind: Type.Literal("capability"), requires: Names }, closed),
]);
export const RequirementsSchema = Type.Object({ controller: Name, dependencies: Names }, closed);
export type DependencyDefinition = Static<typeof DependencySchema>;
export type ControllerDefinition = Extract<DependencyDefinition, { kind: "controller" }>;
type ControllersMissing<Id extends string, C extends ControllerDefinition> =
  C extends unknown
    ? string extends C["objects"][number]
      ? C
      : [Id] extends [C["objects"][number]] ? never : C
    : never;
export type RequirementsFor<Id extends string, C extends ControllerDefinition> = {
  controller: C, dependencies: DependencyDefinition[],
} & ([NoInfer<ControllersMissing<Id, C>>] extends [never] ? unknown : { controller: never });
type Requirements = {
  controller: ControllerDefinition, dependencies: DependencyDefinition[],
};

export function controllerRole<const Id extends string, const O extends ObjectDefinition[]>(definition: {
  id: Id, objects: O, requires: DependencyDefinition[],
}) {
  return { id: definition.id, kind: "controller" as const,
    objects: definition.objects.map(object => object.id as O[number]["id"]),
    requires: definition.requires.map(dependency => dependency.id) };
}

export function capability<const Id extends string>(definition: { id: Id, requires: DependencyDefinition[] }) {
  return { id: definition.id, kind: "capability" as const, requires: definition.requires.map(dependency => dependency.id) };
}

export function requirementReferences(requirements: Requirements) {
  return { controller: requirements.controller.id, dependencies: requirements.dependencies.map(dependency => dependency.id) };
}
