import { Type, type Static } from "@sinclair/typebox";
import type { ProductDefinition } from "./contracts.ts";
import { BindingSchema, type DependencyBinding } from "./bindings.ts";

const closed = { additionalProperties: false };
const Name = Type.String({ minLength: 1 });
const Base = { id: Name, product: Name };
export const DistributionSchema = Type.Union([
  Type.Object({ ...Base, kind: Type.Literal("controller"), runtime: Type.Literal("node"), storage: Type.Literal("postgresql"),
    serves: Type.Array(Name, { minItems: 1, uniqueItems: true }),
    provides: Type.Array(Name, { uniqueItems: true }) }, closed),
  Type.Object({ ...Base, kind: Type.Literal("client"), surface: Name, bindings: Type.Array(BindingSchema),
    renderer: Type.Union([Type.Literal("svelte-web"), Type.Literal("swiftui-ios"), Type.Literal("terminal-cli")]) }, closed),
]);
export type DistributionDefinition = Static<typeof DistributionSchema>;
type SurfaceOf<P extends ProductDefinition> = NonNullable<P["surfaces"]>[number];
type Client = Extract<DistributionDefinition, { kind: "client" }>;
type DependencyOf<P extends ProductDefinition> = NonNullable<P["dependencies"]>[number];

export function controllerDistribution<const Id extends string, const P extends ProductDefinition>(definition: {
  id: Id, product: P, runtime: "node", storage: "postgresql", serves: NoInfer<SurfaceOf<P>>[],
  provides: NoInfer<DependencyOf<P>>[],
}) {
  return { ...definition, kind: "controller" as const, product: definition.product.id as P["id"],
    serves: definition.serves.map(surface => surface.id), provides: definition.provides.map(dependency => dependency.id) };
}

export function clientDistribution<const Id extends string, const P extends ProductDefinition>(definition: {
  id: Id, product: P, surface: NoInfer<Extract<SurfaceOf<P>, { kind: "human" }>>,
  renderer: Client["renderer"],
  bindings: (DependencyBinding & { dependency: NoInfer<DependencyOf<P>["id"]> })[],
}) {
  return { ...definition, kind: "client" as const, product: definition.product.id,
    surface: definition.surface.id };
}
