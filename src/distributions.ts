import { Type, type Static } from "@sinclair/typebox";
import type { ProductDefinition } from "./contracts.ts";
import type { Frozen } from "./json.ts";
import { BindingSchema, dependencyIdentity, type AuthoredDependencyBinding } from "./bindings.ts";
import type { ModuleReference } from "./modules/reference-types.ts";

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
type SurfaceOf<P extends Frozen<ProductDefinition>> = NonNullable<P["surfaces"]>[number];
type SurfaceIdentity<S> = S extends { id: string; kind: string } ? Pick<S, "id" | "kind"> : never;
type SurfaceReference<P extends Frozen<ProductDefinition>> = SurfaceIdentity<SurfaceOf<P>>;
type HumanSurfaceReference<P extends Frozen<ProductDefinition>> = Pick<Extract<SurfaceOf<P>, { kind: "human" }>, "id" | "kind">;
type Client = Extract<DistributionDefinition, { kind: "client" }>;
type DependencyOf<P extends Frozen<ProductDefinition>> = NonNullable<P["dependencies"]>[number];
type DependencyReference<P extends Frozen<ProductDefinition>> = NoInfer<DependencyOf<P>>
  | ModuleReference<"dependency", string, NoInfer<DependencyOf<P>["id"]>, NoInfer<DependencyOf<P>>>;

export function controllerDistribution<const Id extends string, const P extends Frozen<ProductDefinition>>(definition: {
  id: Id, product: P, runtime: "node", storage: "postgresql", serves: NoInfer<SurfaceReference<P>>[],
  provides: DependencyReference<P>[],
}) {
  return { ...definition, kind: "controller" as const, product: definition.product.id as P["id"],
    serves: definition.serves.map(surface => surface.id), provides: definition.provides.map(dependency => dependencyIdentity(dependency, definition.product)) };
}

export function clientDistribution<const Id extends string, const P extends Frozen<ProductDefinition>>(definition: {
  id: Id, product: P, surface: NoInfer<HumanSurfaceReference<P>>,
  renderer: Client["renderer"],
  bindings: AuthoredDependencyBinding<DependencyReference<P>>[],
}) {
  return { ...definition, kind: "client" as const, product: definition.product.id,
    surface: definition.surface.id,
    bindings: definition.bindings.map(binding => ({ ...binding, dependency: dependencyIdentity(binding.dependency, definition.product) })) };
}
