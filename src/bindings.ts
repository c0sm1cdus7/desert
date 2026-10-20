import { Type, type Static } from "@sinclair/typebox";
import type { DependencyDefinition } from "./dependencies.ts";

const Name = Type.String({ minLength: 1 });
const closed = { additionalProperties: false };
export const BindingSchema = Type.Union([
  Type.Object({ dependency: Name, kind: Type.Literal("local"), adapter: Name }, closed),
  Type.Object({ dependency: Name, kind: Type.Literal("remote"), service: Name }, closed),
]);
export type DependencyBinding = Static<typeof BindingSchema>;

export function localBinding<const D extends DependencyDefinition>(dependency: D, adapter: string) {
  return { dependency: dependency.id as D["id"], kind: "local" as const, adapter };
}

export function remoteBinding<const D extends DependencyDefinition>(dependency: D,
  service: { id: string, kind: "controller" }) {
  return { dependency: dependency.id as D["id"], kind: "remote" as const, service: service.id };
}
