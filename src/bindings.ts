import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { DependencySchema, type DependencyDefinition } from "./dependencies.ts";
import type { Frozen } from "./json.ts";
import { jsonSnapshot } from "./json.ts";
import type { ModuleReference } from "./modules/reference-types.ts";
import { isModuleOwned, publicReference } from "./modules/references.ts";
import { requireLocalProductDependency, requireMountedReference } from "./modules/module-catalog.ts";

const Name = Type.String({ minLength: 1 });
const closed = { additionalProperties: false };
export const BindingSchema = Type.Union([
  Type.Object({ dependency: Name, kind: Type.Literal("local"), adapter: Name }, closed),
  Type.Object({ dependency: Name, kind: Type.Literal("remote"), service: Name }, closed),
]);
export type DependencyBinding = Static<typeof BindingSchema>;
export type DependencyTarget = Frozen<DependencyDefinition> | ModuleReference<"dependency", string, string, Frozen<DependencyDefinition>>;
export type AuthoredDependencyBinding<D extends DependencyTarget = DependencyTarget> =
  | { dependency: D; kind: "local"; adapter: string }
  | { dependency: D; kind: "remote"; service: string };
export function dependencyIdentity(target: DependencyTarget, product?: object): string {
  const emitted = publicReference(target, "dependency");
  if (emitted) {
    if (product) requireMountedReference(product, emitted.module);
    return emitted.id;
  }
  const source = jsonSnapshot(target);
  if (!Check(DependencySchema, source)) throw new Error("INVALID_DEPENDENCY_REFERENCE");
  if (isModuleOwned(target)) throw new Error("PRIVATE_MODULE_REFERENCE");
  if (product) requireLocalProductDependency(product, target);
  return source.id;
}

export function localBinding<const D extends DependencyTarget>(dependency: D, adapter: string) {
  dependencyIdentity(dependency);
  return { dependency, kind: "local" as const, adapter };
}

export function remoteBinding<const D extends DependencyTarget>(dependency: D,
  service: { id: string, kind: "controller" }) {
  dependencyIdentity(dependency);
  return { dependency, kind: "remote" as const, service: service.id };
}
