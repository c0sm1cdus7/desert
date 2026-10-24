# Real DESERT API and runtime grammar

Generated from this bundle's source. Do not edit this snapshot.
Regenerate with npm run authoring:generate; npm run authoring:check detects drift.
Paths below are relative to the SDK root. Read imports/types together; these are
verbatim modules, not standalone snippets or a published package API.

- src/index.ts
- src/contracts.ts
- src/modules/compiled-product.ts
- src/commands.ts
- src/journeys.ts
- src/exposures.ts
- src/authoring-types.ts
- src/distributions.ts
- src/dependencies.ts
- src/bindings.ts
- src/interaction/catalog.ts
- src/interaction/input-mask.ts
- src/views/index.ts
- src/views/authored-view.ts
- src/modules/authored-types.ts
- src/views/media-library.ts
- src/modules/definition.ts
- src/modules/publish-object.ts
- src/views/authoring-ports.ts
- src/views/reference-helpers.ts
- src/views/object-presentation.ts
- src/modules/compose.ts
- src/messages/catalog.ts
- src/views/definition.ts
- src/modules/module-index.ts
- src/modules/types.ts
- src/views/components.ts
- src/views/define-view.ts
- src/activities/authoring.ts
- src/activities/experience.ts
- src/program-grammar.ts
- src/validation.ts
- src/local.ts
- src/prepare-options.ts
- src/local/controller.ts
- src/local/session.ts
- src/local/identity.ts
- src/web/build.ts
- src/views/schema.ts
- src/views/ports.ts
- src/views/program-schema.ts
- src/views/program.ts
- src/views/program-views.ts
- src/views/program-outputs.ts
- src/modules/schema.ts
- src/modules/ownership.ts
- src/modules/presentation.ts
- src/modules/product-index.ts
- src/modules/human-presentation.ts
- src/modules/compile-exposures.ts
- src/modules/admission.ts
- src/modules/references.ts
- src/modules/reference-types.ts
- src/modules/lower-references.ts
- src/modules/declaration-data.ts
- src/modules/links.ts
- src/modules/module-source.ts
- src/human-exposure.ts
- src/navigation-ownership.ts
- src/connection-policy.ts
- src/surface-fields.ts
- src/field-definition.ts
- src/field-representation.ts
- src/command-input-targets.ts
- src/preparation-projection.ts
- src/interaction/protocol.ts
- src/authoring/index.ts
- src/authoring/imports.ts
- src/authoring/syntax.ts
- src/authoring/expressions.ts

## src/index.ts

Source SHA-256: 4ae435a064253c5fb63249b76b57d6e1aa1d940f41d4d34b99e443ecb773a0b5

```ts
export { objectType, text, integer, enumeration, principal, imageAsset, mediaAsset, labels, references, namedReferences, mediaReferences } from "./contracts.ts";
export type { FieldDefinition, ObjectDefinition, ProductDefinition } from "./contracts.ts";
export { compile } from "./modules/compiled-product.ts";
export { createCommand, updateCommand, fromInput, literal, actorId } from "./commands.ts";
export { mutationJourney, readJourney, ownershipPolicy } from "./journeys.ts";
export { humanExposure, agentExposure } from "./exposures.ts";
export type { FactsOf, InputOf } from "./authoring-types.ts";
export { clientDistribution, controllerDistribution } from "./distributions.ts";
export { controllerRole, capability } from "./dependencies.ts";
export { localBinding, remoteBinding } from "./bindings.ts";
export { ResolvedNodes } from "./interaction/catalog.ts";
export type { ResolvedNodeId, ResolvedInputId, RendererTable } from "./interaction/catalog.ts";
export { inputMask, InputMaskSchema } from "./interaction/input-mask.ts";
export type { InputMask } from "./interaction/input-mask.ts";
export { ViewVersion, ViewLimits, ViewSchema, MediaLibrarySchema } from "./views/index.ts";
export { authoredView as view } from "./views/authored-view.ts";
export type { AuthoredView as View, AuthoredViewRef as ViewRef, AuthoredViewJourney as ViewJourney,
  AuthoredViewDestination as ViewDestination, AuthoredViewNavigationEntry as ViewNavigationEntry,
  AuthoredViewOutputBinding as ViewOutputBinding, AuthoredViewOutputAction as ViewOutputAction } from "./modules/authored-types.ts";
export type { ViewContent, ViewHeader, ViewHeaderTitle, ViewStack, ViewLeaf, ViewToolbar } from "./views/index.ts";
export { ViewHeaderTitleSchema } from "./views/index.ts";
export { ViewProgramVersion, ViewProgramSchema, ViewNavigationEntrySchema, viewInputs, compileViewProgram } from "./views/index.ts";
export type { ViewProgram,
  ViewBoundContent, ViewItem, ViewMediaContent } from "./views/index.ts";
export type { DeclaredMediaLibrary as MediaLibrary } from "./views/media-library.ts";
export { defineModule } from "./modules/definition.ts";
export { publishObject } from "./modules/publish-object.ts";
export { viewPorts } from "./views/authoring-ports.ts";
export { factReference, viewOutput, initializeInput, chooseFile } from "./views/reference-helpers.ts";
export type { FactReference } from "./views/reference-helpers.ts";
export { ObjectPresentationSchema } from "./views/object-presentation.ts";
export type { ObjectPresentation } from "./views/object-presentation.ts";
export { composeProduct } from "./modules/compose.ts";
export { messageCatalog } from "./messages/catalog.ts";
export type { MessageCatalog } from "./messages/catalog.ts";
export type { Message } from "./views/definition.ts";
export { moduleIndex } from "./modules/module-index.ts";
export type { ModuleDefinition, RegisteredModule, ModuleIndex, ModuleJourney, ModuleReference, ProductComposition,
  AuthoredViewJourney, AuthoredViewDestination, AuthoredViewNavigationEntry } from "./modules/types.ts";
export { Components, ViewTitles, defineView } from "./views/components.ts";
export type { ViewDeclaration, ViewDock } from "./views/define-view.ts";
export { activityInputs, type ActivityDefinition, type ActivityInput } from "./activities/authoring.ts";
export { activityExperience } from "./activities/experience.ts";
export {AttentionSignalSchema,type AttentionSignal} from './attention.ts';
```

## src/contracts.ts

Source SHA-256: 4c0c7414c68217f6f9529151e1cade72b65077e579d515c63aa96d68ae3b5c66

```ts
import { Type, type Static } from "@sinclair/typebox";
import { JourneySchema, PolicySchema, ExposureSchema } from "./program-grammar.ts";
import { DependencySchema } from "./dependencies.ts";
import { FieldDefinitionSchema } from "./field-definition.ts";
export { text, integer, principal, enumeration, imageAsset, mediaAsset, labels, references, namedReferences, mediaReferences, type FieldDefinition } from "./field-definition.ts";
const ObjectDefinition = Type.Object({
  id: Type.String({ minLength: 1 }),
  facts: Type.Record(Type.String({ minLength: 1 }), FieldDefinitionSchema, { minProperties: 1, additionalProperties: false }),
  /** Sets of scalar facts no two objects of this type share, enforced by the typed object tables (src/storage/ddl.ts);
   * the local controller refuses them (UNIQUE_NOT_YET_ENFORCED) until objects are stored there (plan §15, slice 7.2). */
  unique: Type.Optional(Type.Array(Type.Array(Type.String({ minLength: 1 }), { minItems: 1, uniqueItems: true }), { minItems: 1, uniqueItems: true })),
}, { additionalProperties: false });

export const ProductDefinitionSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  objects: Type.Array(ObjectDefinition, { minItems: 1 }),
  policies: Type.Optional(Type.Array(PolicySchema)),
  journeys: Type.Optional(Type.Array(JourneySchema)),
  surfaces: Type.Optional(Type.Array(ExposureSchema)),
  dependencies: Type.Optional(Type.Array(DependencySchema)),
}, { additionalProperties: false });

export type ObjectDefinition = Static<typeof ObjectDefinition>;
export type ProductDefinition = Static<typeof ProductDefinitionSchema>;

export function objectType<const O extends ObjectDefinition>(definition: O): O { return definition; }
export function product<const P extends ProductDefinition>(definition: P): P { return definition; }
```

## src/modules/compiled-product.ts

Source SHA-256: 11d4fd2b9155c796c6164315303fc12fd301ba09bc39da3a2ef556b073544966

```ts
import type { compile as compileContract } from "../compile.ts";
import type { ViewProgram } from "../views/program-schema.ts";
import type { composeProduct } from "./compose.ts";

type Application = ReturnType<typeof compileContract>;
const applications = new WeakMap<object, Application>();
const programs = new WeakMap<object, ViewProgram>();

export function registerCompiledProduct(product: object, application: Application, program: ViewProgram): void {
  applications.set(product, application);
  programs.set(application, program);
}

export function compile(product: ReturnType<typeof composeProduct>): Application {
  const application = typeof product === "object" && product !== null ? applications.get(product) : undefined;
  if (!application) throw new Error("COMPOSED_PRODUCT_REQUIRED");
  return application;
}

export function productViewProgram(application: Application): ViewProgram {
  const program = programs.get(application);
  if (!program) throw new Error("COMPOSED_PRODUCT_REQUIRED");
  return program;
}
```

## src/commands.ts

Source SHA-256: 7ae5e0624ae80ef2fd8c9b6a75e89f90590d7a4569bc7a7f0417415b32e32502

```ts
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
```

## src/journeys.ts

Source SHA-256: e55d6f494e6aea6c97fa44208871013adecd117795d1abeacea055eda195eb11

```ts
import type { ObjectDefinition } from "./contracts.ts";
import type { Conditions, FieldKey } from "./authoring-types.ts";
import type { CommandDefinition } from "./program-grammar.ts";
import { requirementReferences, type ControllerDefinition, type RequirementsFor } from "./dependencies.ts";

export function mutationJourney<const Id extends string, const C extends CommandDefinition, const R extends ControllerDefinition>(
  id: Id, command: C, requires: RequirementsFor<NoInfer<C["object"]>, R>,
) {
  return { id, kind: "mutation" as const, command, requires: requirementReferences(requires),
    confirmation: "prepared-effect" as const, outcome: "receipt" as const };
}

export function readJourney<const Id extends string, const O extends ObjectDefinition, const R extends ControllerDefinition>(
  id: Id, object: O, definition: { fields: FieldKey<NoInfer<O>>[], collection: FieldKey<NoInfer<O>>[],
    where?: Conditions<NoInfer<O>>, requires: RequirementsFor<NoInfer<O["id"]>, R> },
) {
  return { id, kind: "read" as const, object: object.id as O["id"], ...definition, requires: requirementReferences(definition.requires) };
}

export function ownershipPolicy<const O extends ObjectDefinition>(object: O, field: {
  [K in FieldKey<NoInfer<O>>]: O["facts"][K] extends { kind: "principal" } ? K : never;
}[FieldKey<NoInfer<O>>]) {
  return { kind: "ownership" as const, object: object.id, field };
}
```

## src/exposures.ts

Source SHA-256: 0f0e053ebbfff2cf639583d37ce1f772d877840c3daaf3b5e03972b4fcf20908

```ts
import { Check } from "@sinclair/typebox/value";
import { JourneySchema } from "./program-grammar.ts";
import { AuthoredHumanExposureSchema, requireJourneyOwnedSurfaceSemantics, type WithoutSurfaceSemantics } from "./human-exposure.ts";
import { jsonSnapshot } from "./json.ts";
import { closed } from "./views/definition.ts";
import type { ExposedJourney } from "./modules/authored-types.ts";
import { publicReference, requireJourneyUse } from "./modules/references.ts";
import { declarationArray, declarationRecord } from "./modules/declaration-data.ts";

type HumanExposureAuthoring = {
  readonly id: string; readonly journeys: readonly ExposedJourney[]; readonly locale: string;
} & WithoutSurfaceSemantics;
const HumanExposureAuthoringSchema = closed({
  id: AuthoredHumanExposureSchema.properties.id, locale: AuthoredHumanExposureSchema.properties.locale,
  journeys: AuthoredHumanExposureSchema.properties.journeys,
});
function exposedIdentity(value: unknown): string {
  const emitted = publicReference(value, "journey");
  if (emitted) { requireJourneyUse(emitted, "execution"); return emitted.id; }
  if (typeof value === "string") throw new Error("STRING_MODULE_REFERENCE_FORBIDDEN");
  const source = jsonSnapshot(value);
  if (!Check(JourneySchema, source)) throw new Error("MODULE_EXPOSURE_REQUIRES_EXECUTION");
  return source.id;
}

export function humanExposure<const D extends HumanExposureAuthoring>(
  definition: D & Record<Exclude<keyof D, keyof HumanExposureAuthoring>, never>,
) {
  requireJourneyOwnedSurfaceSemantics(definition);
  const source = declarationRecord(definition);
  const journeys = declarationArray(source.journeys);
  const checked = jsonSnapshot({ ...source, journeys: journeys.map(exposedIdentity) });
  if (!Check(HumanExposureAuthoringSchema, checked)) throw new Error("INVALID_HUMAN_EXPOSURE");
  return Object.freeze({ id: checked.id as D["id"], kind: "human" as const, locale: checked.locale,
    journeys: Object.freeze([...journeys]) as D["journeys"] });
}

export function agentExposure<const Id extends string, const J extends readonly ExposedJourney[]>(id: Id, journeys: J) {
  declarationArray(journeys).forEach(exposedIdentity);
  if (!id) throw new Error("INVALID_AGENT_EXPOSURE");
  return Object.freeze({ id, kind: "agent" as const, journeys: Object.freeze([...journeys]) as J });
}
```

## src/authoring-types.ts

Source SHA-256: 3d329d2f11077e3a347d0a1296f369b89e9f78c216c63246670782e672de914d

```ts
import type { FieldDefinition, ObjectDefinition } from "./contracts.ts";
import type { AssetReference } from "./assets/types.ts";

export type FieldValue<F extends FieldDefinition> = F extends { kind: "integer" } ? number
  : F extends { kind: "labels" } ? readonly string[]
  : F extends { kind: "asset" } ? AssetReference : F extends { kind: "enum", values: (infer V)[] } ? V : string;
export type FactsOf<O extends ObjectDefinition> = { [K in keyof O["facts"]]: FieldValue<O["facts"][K]> };
export type FieldKey<O extends ObjectDefinition> = keyof O["facts"] & string;
export type WritableKey<O extends ObjectDefinition> = {
  [K in FieldKey<O>]: O["facts"][K] extends { kind: "principal" } ? never : K;
}[FieldKey<O>];
type CompatibleInput<O extends ObjectDefinition, Keys extends FieldKey<O>, F extends FieldDefinition> = {
  [K in Keys]: O["facts"][K]["kind"] extends F["kind"]
    ? FieldValue<O["facts"][K]> extends FieldValue<F> ? { kind: "input", field: K } : never : never;
}[Keys];
type Assignment<O extends ObjectDefinition, Keys extends FieldKey<O>, F extends FieldDefinition> =
  F extends { kind: "principal" } ? { kind: "actor" }
    : F extends { kind: "asset" } ? CompatibleInput<O, Keys, F>
    : F extends { kind: "labels" } ? { kind: "literal", value: [] } | CompatibleInput<O, Keys, F>
    : { kind: "literal", value: FieldValue<F> } | CompatibleInput<O, Keys, F>;
export type CreateValues<O extends ObjectDefinition, Keys extends FieldKey<O>> = {
  [K in FieldKey<O>]: Assignment<O, Keys, O["facts"][K]>;
};
export type ChangeValues<O extends ObjectDefinition, Keys extends FieldKey<O>> = {
  [K in WritableKey<O>]?: Assignment<O, Keys, O["facts"][K]>;
};
export type ScalarKey<O extends ObjectDefinition> = {
  [K in FieldKey<O>]: O["facts"][K] extends { kind: "asset" | "labels" } ? never : K;
}[FieldKey<O>];
export type Conditions<O extends ObjectDefinition> = Partial<Pick<FactsOf<O>, ScalarKey<O>>>;
export type InputOf<O extends ObjectDefinition, C extends { object: O["id"], input: WritableKey<O>[] }> =
  Pick<FactsOf<O>, C["input"][number]>;
```

## src/distributions.ts

Source SHA-256: 50561d567fc4552ee490468ecc4a3dba93678a160e0314a73c2a7bed0a36231e

```ts
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
```

## src/dependencies.ts

Source SHA-256: ede2aaba22cfed5f348b517d3d861c445308b173e7a823f114833390596e909b

```ts
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
```

## src/bindings.ts

Source SHA-256: 0a0416d15e6441b56b7b65a5ad94cebed521fed1c92572d53a469e9d1bfa41b3

```ts
import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { DependencySchema, type DependencyDefinition } from "./dependencies.ts";
import type { Frozen } from "./json.ts";
import { jsonSnapshot } from "./json.ts";
import type { ModuleReference } from "./modules/reference-types.ts";
import { isModuleOwned, publicReference } from "./modules/references.ts";
import { requireLocalProductDependency, requireMountedReference } from "./modules/module-index.ts";

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
```

## src/interaction/catalog.ts

Source SHA-256: 1ac4198d9de5c0efb6191a29ce36d540669b31e1a58c2616a4a6c9cdfb77549a

```ts
import { Type } from "@sinclair/typebox";
import { freezeDeep, jsonSnapshot } from "../json.ts";
import { ControlSpecimens } from "./control-specimens.ts";
import { CatalogGroups, CatalogFoundations, catalogInspection, type DiscoveryGroup, type FoundationId } from "./catalog-ownership.ts";

function entry<const Id extends string, const Family extends string, const States extends readonly string[]>(
  id: Id, family: Family, states: States, group: DiscoveryGroup, owners: readonly FoundationId[]) {
  return { id, family, states, inspection: catalogInspection(id, states, group, owners,
    ['tests/bank-node.test.ts', 'tests/public-catalog-bank.test.ts']) };
}

export const ResolvedNodes = freezeDeep({
  id: "desert.human-interaction", version: "0.5.0",
  groups: CatalogGroups, foundations: CatalogFoundations,
  entries: [
    entry("input.text", "primitive", ["empty", "value", "invalid", "disabled", "loading", "offline"], "foundations", ["pane", "well"]),
    entry("input.multiline", "primitive", ["empty", "value", "invalid", "disabled", "loading", "offline"], "foundations", ["pane", "well"]),
    entry("fact", "primitive", ["known", "empty", "unknown"], "foundations", ["stack", "status"]),
    entry("action", "primitive", ["ready", "unavailable", "pending", "loading", "offline"], "foundations", ["pane", "action"]),
    entry("availability", "primitive", ["unknown", "ready", "unavailable"], "foundations", ["status"]),
    entry("collection", "composition", ["empty", "records", "state-summary", "media-grid", "media-list", "collection-grid", "loading", "offline"], "compositions", ["stack", "pane", "action"]),
    entry("form", "composition", ["incomplete", "ready", "disconnected"], "compositions", ["stack", "well", "action"]),
    entry("context", "composition", ["available", "unavailable", "media-object"], "compositions", ["stack", "action"]),
    entry("review", "composition", ["prepared", "uncertain"], "compositions", ["stack", "status", "action"]),
    entry("transient", "composition", ["open", "locked"], "compositions", ["pane", "stack", "action"]),
    entry("problem", "composition", ["error", "warning"], "compositions", ["pane", "status", "action"]),
    entry("catalog.card", "composition", ["featured", "item"], "compositions", ["stack", "action"]),
    entry("catalog.home", "composition", ["populated"], "compositions", ["stack"]),
    entry("catalog.detail", "composition", ["reading"], "compositions", ["stack"]),
    ...ControlSpecimens.map(({ id, family, specimens, inspection }) => ({ id, family, states: specimens.map(specimen => specimen.state), inspection })),
  ] as const,
});

export type ResolvedNodeId = typeof ResolvedNodes.entries[number]["id"];
/** The id of a resolved node kind, as a TypeBox schema derived from the entries above (not a second list). */
export const ResolvedNodeIdSchema = Type.Union(ResolvedNodes.entries.map(entry => Type.Literal(entry.id)));
export type ResolvedInputId = Extract<ResolvedNodeId, `input.${string}`>;
export type RendererTable<T> = { readonly [K in ResolvedNodeId]: T };

export function requireCatalog(candidate: unknown) {
  if (JSON.stringify(jsonSnapshot(candidate)) !== JSON.stringify(jsonSnapshot(ResolvedNodes))) {
    throw new Error("INTERACTION_CATALOG_MISMATCH");
  }
}
```

## src/interaction/input-mask.ts

Source SHA-256: bdc1ad79df040d5a5d090f3a6f0f13806fc2b8806457d7048cb38e91e2330b3c

```ts
import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { decimalMaskLocale } from "./decimal-mask-locale.ts";

/** Installed editing syntax, not a domain value or an alternate domain validator. */
export const InputMaskSchema = Type.Object({ kind: Type.Literal("decimal"),
  locale: Type.String({ minLength: 1 }), scale: Type.Integer({ minimum: 0, maximum: 6 }),
}, { additionalProperties: false });
export type InputMask = Frozen<Static<typeof InputMaskSchema>>;
export type MaskedValue = Readonly<{ value: string; valid: boolean; complete: boolean }>;

export function inputMask(value: unknown): InputMask {
  const snapshot = jsonSnapshot(value);
  if (!Check(InputMaskSchema, snapshot)) throw new Error("INVALID_INPUT_MASK");
  decimalMaskLocale(snapshot.locale);
  return freezeDeep(snapshot);
}

export function maskSeparators(mask: InputMask): { group: string; decimal: string } {
  const { group, decimal } = decimalMaskLocale(inputMask(mask).locale);
  return { group, decimal };
}

function lexical(value: string, scale: number): boolean {
  return value === "" || value === "-" || /^-?\d+(?:\.\d*)?$/.test(value) &&
    (value.split(".")[1]?.length ?? 0) <= scale;
}

/** Preserve writing (including zeros and a trailing decimal); never normalize or round it. */
export function formatMaskedValue(canonical: string, mask: InputMask): string {
  const checked = inputMask(mask);
  if (!lexical(canonical, checked.scale) || canonical === "") return canonical;
  const locale = decimalMaskLocale(checked.locale);
  const negative = canonical.startsWith("-");
  if (canonical === "-") return locale.minus;
  const [whole, fraction] = (negative ? canonical.slice(1) : canonical).split(".");
  return `${negative ? locale.minus : ""}${locale.groupDigits(whole!)}${fraction === undefined ? "" : locale.decimal + fraction}`;
}

/** Paste is strict; native edits may temporarily displace only known integer-group marks. */
export function readMaskedValue(display: string, mask: InputMask, strictGrouping = true): MaskedValue {
  const checked = inputMask(mask);
  const locale = decimalMaskLocale(checked.locale);
  const invalid = (): MaskedValue => ({ value: display, valid: false, complete: false });
  if (display === "") return { value: "", valid: true, complete: true };
  const negative = display.startsWith(locale.minus) || display.startsWith("-");
  const unsigned = negative ? display.slice(display.startsWith(locale.minus) ? locale.minus.length : 1) : display;
  if (negative && unsigned === "") return { value: "-", valid: true, complete: false };
  const pieces = unsigned.split(locale.decimal);
  if (pieces.length > 2) return invalid();
  const [whole, fraction] = pieces;
  const digits = whole!.split(locale.group).join("");
  if (!/^\d+$/.test(digits) || (fraction !== undefined && !/^\d*$/.test(fraction))) return invalid();
  if (strictGrouping && whole!.includes(locale.group) && locale.groupDigits(digits) !== whole) return invalid();
  const value = `${negative ? "-" : ""}${digits}${fraction === undefined ? "" : `.${fraction}`}`;
  if (!lexical(value, checked.scale)) return invalid();
  return { value, valid: true, complete: fraction !== "" };
}
```

## src/views/index.ts

Source SHA-256: 0938566d207d9f6cf7d7c0ec10edc8ec2260d82955d2a8de169ff911719b5811

```ts
export {
  ViewVersion, ViewLimits, ViewSchema, ViewContentSchema, ViewHeaderSchema, ViewHeaderTitleSchema, ViewStackSchema,
  ViewLeafSchema, ViewToolbarSchema, ViewRefSchema, ViewBoundContentSchema, ViewCatalogContentSchema, ViewItemSchema,
  ViewMediaContentSchema,
} from "./schema.ts";
export type { View, ViewContent, ViewHeader, ViewHeaderTitle, ViewStack, ViewLeaf, ViewToolbar, ViewRef } from "./schema.ts";
export type { ViewBoundContent, ViewItem, ViewMediaContent } from "./schema.ts";
export { MediaLibrarySchema } from "./media-library.ts";
export type { MediaLibrary } from "./media-library.ts";
export { view } from "./view.ts";
export { viewIndex } from "./view-index.ts";
export { viewInputs } from "./ports.ts";
export { ViewProgramVersion, ViewProgramSchema, ViewJourneySchema, ViewDestinationSchema, ViewNavigationEntrySchema,
  ViewOutputBindingSchema, ViewOutputActionSchema } from "./program-schema.ts";
export type { ViewProgram, ViewJourney, ViewDestination, ViewNavigationEntry, ViewOutputBinding, ViewOutputAction } from "./program-schema.ts";
export { compileViewProgram } from "./program.ts";
```

## src/views/authored-view.ts

Source SHA-256: 0693aa17d0ec04ada5e8dc8c5c8c1f16d638e42cc7475cda1cf75927dbced102

```ts
import type { AuthoredView, ViewTarget } from "../modules/authored-types.ts";
import { publicReference } from "../modules/references.ts";
import { declarationRecord } from "../modules/declaration-data.ts";
import { view as canonicalView } from "./view.ts";

export function viewTargetDefinition(value: ViewTarget) {
  const emitted = publicReference(value, "view");
  return emitted ? declarationRecord(emitted.value) : declarationRecord(value);
}

/** Validate the View's data while retaining composition identity until the module boundary. */
export function authoredViewData(value: AuthoredView) {
  const source = declarationRecord(value);
  const docks = Object.fromEntries(["leftDock", "rightDock"].filter(key => Object.hasOwn(source, key)).map(key => {
    const dock = declarationRecord(source[key]);
    if (typeof dock.view === "string") throw new Error("STRING_MODULE_REFERENCE_FORBIDDEN");
    return [key, { ...dock, view: viewTargetDefinition(dock.view as ViewTarget).id }];
  }));
  return canonicalView({ ...source, ...docks });
}
export function authoredView<const V extends AuthoredView>(value: V): V {
  const source = declarationRecord(value);
  const checked = authoredViewData(value);
  return Object.freeze({ ...checked, ...Object.fromEntries(["leftDock", "rightDock"].filter(key => Object.hasOwn(source, key)).map(key =>
    [key, Object.freeze(declarationRecord(source[key]))])) }) as unknown as V;
}
```

## src/modules/authored-types.ts

Source SHA-256: fd9c186197ae4130006a0e725f6e4ab3467c79e8c3ac05b33a94b5f2669e07e5

```ts
import type { Frozen } from "../json.ts";
import type { JourneyDefinition } from "../program-grammar.ts";
import type { DeclaredView as WireView, ViewRef as WireViewRef } from "../views/schema.ts";
import type { Declared } from "../views/declared.ts";
import type { Message } from "../views/definition.ts";
import type { ViewJourney, ViewDestination, ViewNavigationEntry } from "../views/program-schema.ts";
import type { ModuleReference } from "./reference-types.ts";
import type { ActivityDefinition } from "../activities/authoring.ts";

export type AuthoredView = Omit<WireView, "leftDock" | "rightDock"> & {
  readonly leftDock?: AuthoredViewRef; readonly rightDock?: AuthoredViewRef;
};
export type ViewTarget = AuthoredView | ModuleReference<"view", string, string, AuthoredView>;
export type AuthoredViewRef = Omit<WireViewRef, "view"> & { readonly view: ViewTarget };
export type JourneyTarget = Frozen<JourneyDefinition> | AuthoredViewJourney | ModuleReference<"journey">;
type ReadExecution = Frozen<Extract<JourneyDefinition, { kind: "read" }>>;
export type ReadJourneyTarget = ReadExecution | Journey<Extract<ViewJourney, { kind: "read" }>>
  | ModuleReference<"journey", string, string, { readonly execution: ReadExecution }>;
type Output<O> = O extends { readonly view: string; readonly action: infer A }
  ? Omit<O, "view" | "action"> & { readonly view: ViewTarget; readonly action:
    A extends { readonly journey: string } ? Omit<A, "journey"> & { readonly journey: JourneyTarget } : A }
  : never;
type Journey<J> = J extends ViewJourney ? {
  readonly [K in keyof J]: K extends "view" | "detailView" ? ViewTarget
    : K extends "source" ? ReadJourneyTarget
    : K extends "initializeFrom" ? { readonly input: string; readonly source: ReadJourneyTarget }
    : K extends "related" ? readonly { readonly input: string; readonly read: ReadJourneyTarget;
        readonly membership?: { readonly update: ExposedJourney; readonly input: string };
        readonly layout?: { readonly object: string; readonly field: string };
        readonly where: { readonly field: { readonly object: string; readonly field: string }; readonly includes: "subject" } }[]
    : K extends "activity" ? ActivityDefinition
    : K extends "collections" ? readonly { readonly input: string; readonly read: ReadJourneyTarget; readonly limit: number;
        readonly summary?: { readonly field: {readonly object:string;readonly field:string};
          readonly segments: readonly {readonly value:string;readonly label:Message}[] };
        readonly preview?: { readonly read: ReadJourneyTarget; readonly where: { readonly object: string; readonly field: string };
          readonly media: { readonly object: string; readonly field: string }; readonly cover?: { readonly object: string; readonly field: string } };
        readonly where?: { readonly field: string; readonly value: string } }[]
    : K extends "outputs" ? readonly Output<J["outputs"][number]>[] : J[K];
} : never;
export type AuthoredViewJourney = Journey<ViewJourney>;
export type AuthoredViewOutputBinding = AuthoredViewJourney["outputs"][number];
export type AuthoredViewOutputAction = AuthoredViewOutputBinding["action"];
export type AuthoredViewDestination = Omit<Declared<ViewDestination>, "entryJourney"> & { readonly entryJourney: JourneyTarget };
export type DestinationTarget = AuthoredViewDestination | ModuleReference<"destination">;
export type AuthoredViewNavigationEntry = Omit<Declared<ViewNavigationEntry>, "destination"> & { readonly destination: DestinationTarget };
export type ExecutableJourneyReference = ModuleReference<"journey", string, string, { readonly execution: Frozen<JourneyDefinition> }>;
export type ExposedJourney = Frozen<JourneyDefinition> | ExecutableJourneyReference;
```

## src/views/media-library.ts

Source SHA-256: b000ad5a8d5219fc843ee3e621691984d178e8f387a483d0d9bf358055c6bda7

```ts
import { Type, type Static } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import { closed, name, text } from "./definition.ts";
import type { Declared } from "./declared.ts";

const artwork = closed({ asset: name, alt: text });
const timed = {
  id: name, title: text, source: closed({ asset: name }), artwork: Type.Optional(artwork),
  captions: Type.Optional(Type.Array(closed({ asset: name, language: text, label: text }), { maxItems: 16 })),
};
export const MediaItemSchema = Type.Union([
  closed({ id: name, kind: Type.Literal("image"), title: text, image: artwork }),
  closed({ ...timed, kind: Type.Literal("video") }),
  closed({ ...timed, kind: Type.Literal("audio") }),
]);
export type MediaItem = Frozen<Static<typeof MediaItemSchema>>;

/** Logical asset references only; serving and verification belong to the host. */
export const MediaLibrarySchema = closed({
  id: name,
  items: Type.Array(MediaItemSchema, { minItems: 1, maxItems: 512 }),
  albums: Type.Array(closed({
    id: name, title: text, cover: name,
    items: Type.Array(name, { minItems: 1, maxItems: 512, uniqueItems: true }),
  }), { minItems: 1, maxItems: 64 }),
  featured: Type.Array(name, { minItems: 1, maxItems: 10, uniqueItems: true }),
});

export type MediaLibrary = Frozen<Static<typeof MediaLibrarySchema>>;
/** A media library as a product declares it: titles, alternative texts and caption labels are messages (plan §14). */
export type DeclaredMediaLibrary = Declared<MediaLibrary>;

/** Album membership may overlap; identities and references never resolve globally. */
export function checkMediaLibrary(library: MediaLibrary): void {
  const items = new Set(library.items.map(item => item.id));
  const albums = new Set(library.albums.map(album => album.id));
  if (items.size !== library.items.length) throw new Error("DUPLICATE_MEDIA_ITEM_ID");
  if (albums.size !== library.albums.length) throw new Error("DUPLICATE_MEDIA_ALBUM_ID");
  for (const album of library.albums) {
    if (album.items.some(id => !items.has(id))) throw new Error("UNKNOWN_ALBUM_MEDIA_ITEM");
    if (!album.items.includes(album.cover)) throw new Error("INVALID_MEDIA_ALBUM_COVER");
  }
  if (library.featured.some(id => !albums.has(id))) throw new Error("UNKNOWN_FEATURED_MEDIA_ALBUM");
}

export const mediaArtwork = (item: MediaItem) => item.kind === "image" ? item.image : item.artwork;

export function mediaLibraryAssets(library: MediaLibrary): readonly string[] {
  return [...new Set(library.items.flatMap(item => item.kind === "image" ? [item.image.asset] : [
    item.source.asset, ...(item.artwork ? [item.artwork.asset] : []), ...(item.captions ?? []).map(track => track.asset),
  ]))];
}
```

## src/modules/definition.ts

Source SHA-256: c958fbf5db596d997598e22e2fd68e48e1653be282688bd697939694668a275c

```ts
import { freezeDeep, jsonSnapshot } from "../json.ts";
import { Check } from "@sinclair/typebox/value";
import { DeclaredModuleDefinitionSchema, ModuleDefinitionSchema } from "./schema.ts";
import { keysAsText } from "../views/declared.ts";
import { ownershipRegistry, validateOwnedDomain } from "./ownership.ts";
import { resolvePresentation } from "./presentation.ts";
import type { Closed, ModuleDefinition, RegisteredModule, ResolvedModuleDefinition } from "./types.ts";
import { validateObjectPublications } from "./object-publication.ts";
import type { ModuleLinks } from "./links.ts";
import { declarationRecord } from "./declaration-data.ts";
import { referenceAdmission } from "./admission.ts";
import { lowerOwnedReferences } from "./lower-references.ts";
import { issueModule } from "./references.ts";
import { registeredModuleSource, rememberModuleSource } from "./module-source.ts";

/** A module is declarations, never an executable controller or renderer extension. */
export function defineModule<const M extends ModuleDefinition>(definition: Closed<M, ModuleDefinition> & ModuleLinks<NoInfer<M>>): RegisteredModule<M> {
  const registered = registeredModuleSource(definition);
  if (registered) return registered as RegisteredModule<M>;
  const source = declarationRecord(definition);
  const admission = referenceAdmission(source, false);
  const aliases = admission.aliases();
  const declared = jsonSnapshot(lowerOwnedReferences(source, admission));
  if (!Check(DeclaredModuleDefinitionSchema, declared)) throw new Error("INVALID_MODULE_DEFINITION");
  // No locale is chosen yet: the structural checks read the shape, each message's key standing in for its sentence.
  const shape = keysAsText(declared);
  if (!Check(ModuleDefinitionSchema, shape)) throw new Error("INVALID_MODULE_DEFINITION");
  const snapshot: ResolvedModuleDefinition = shape;
  const ownership = ownershipRegistry([{ id: snapshot.id, definition: snapshot, exports: snapshot.exports }]);
  validateOwnedDomain(snapshot);
  validateObjectPublications(snapshot);
  resolvePresentation(snapshot, snapshot.id, ownership);
  // The module keeps its messages; the product's catalog resolves them when the product is composed.
  const handle = issueModule(freezeDeep(declared), admission.identities, aliases);
  rememberModuleSource(definition, handle);
  return handle as RegisteredModule<M>;
}
```

## src/modules/publish-object.ts

Source SHA-256: f811ced359cca3b76852a3885154a9ec0c1e1de83f466a7b7e62aa84f852402a

```ts
import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { ProductDefinitionSchema, type ObjectDefinition } from "../contracts.ts";
import { JourneySchema, type JourneyDefinition } from "../program-grammar.ts";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import type { WritableKey, ScalarKey } from "../authoring-types.ts";
import type { FactReference } from "../views/reference-helpers.ts";
import { PublishedPresentationSchema } from "../views/object-presentation.ts";
import { AuthoredPublishedPresentationSchema, validatePublishedFields, type PublishedField } from "./human-presentation.ts";
import { resolvedPublicationIssue } from "../views/publication-semantics.ts";
import { ViewSchema } from "../views/schema.ts";
import type { AuthoredView } from "./authored-types.ts";
import { authoredViewData } from "../views/authored-view.ts";
import { closed } from "../views/definition.ts";
import { declaredSchema, type Declared } from "../views/declared.ts";
import { declarationArray, declarationRecord } from "./declaration-data.ts";
import type { FieldRepresentation } from "../field-representation.ts";

// Declared (plan §14): field labels and selection labels are messages, resolved when the product is composed.
const PublicationSchema = declaredSchema(closed({ ...AuthoredPublishedPresentationSchema.properties, view: ViewSchema,
  actions: Type.Array(closed({ ...PublishedPresentationSchema.properties.actions.items.properties, journey: JourneySchema })) }));
type Publication = Omit<Frozen<Static<typeof PublicationSchema>>, "view"> & { readonly view: AuthoredView };
type SubjectJourney<Id extends string> = Frozen<Extract<JourneyDefinition, { kind: "mutation" }>> & {
  readonly command: { readonly kind: "update"; readonly object: Id };
};
type SubjectAction<Id extends string> = Publication["actions"][number] & { readonly journey: SubjectJourney<Id> };
type PresentedField<O extends ObjectDefinition> = {
  [K in WritableKey<O>]: Omit<Declared<PublishedField>, "fact" | "representation"> & {
    readonly fact: FactReference<O["id"], K>;
    readonly representation: O["facts"][K] extends { readonly kind: "asset" } ? "image"
      : O["facts"][K] extends { readonly kind: "labels" } ? "tags"
      : O["facts"][K] extends { readonly kind: "text" } ? Extract<FieldRepresentation, "text" | "paragraphs"> : "text";
  };
}[WritableKey<O>];

/** The canonical object stays independently importable by commands, without a publication cycle. */
export function publishObject<const O extends ObjectDefinition, const V extends AuthoredView,
  const A extends readonly SubjectAction<NoInfer<O>["id"]>[]>(object: O, definition: Publication & {
    readonly view: V; readonly title: FactReference<NoInfer<O>["id"], WritableKey<NoInfer<O>> & ScalarKey<NoInfer<O>>>; readonly actions: A;
    readonly fields?: readonly PresentedField<NoInfer<O>>[];
  }) {
  const authored = declarationRecord(definition);
  const actions = declarationArray(authored.actions).map(declarationRecord);
  const source = { object: jsonSnapshot(object), definition: jsonSnapshot({ ...authored,
    view: authoredViewData(definition.view), actions }) };
  if (!Check(ProductDefinitionSchema.properties.objects.items, source.object) || !Check(PublicationSchema, source.definition)) {
    throw new Error("INVALID_OBJECT_PUBLICATION");
  }
  validatePublishedFields(source.object, source.definition.fields ?? []);
  const presentation = { view: source.definition.view.id as V["id"],
    title: source.definition.title, actions: source.definition.actions.map(({ journey, ...presentation }) => ({ journey: journey.id, ...presentation })) as {
      [K in keyof A]: Omit<A[K], "journey"> & { journey: A[K]["journey"]["id"] };
    },
    ...(source.definition.fields ? { fields: source.definition.fields } : {}),
  };
  const issue = resolvedPublicationIssue(source.object, presentation, source.definition.actions.map(action => action.journey));
  if (issue) throw new Error(issue);
  return Object.freeze({ ...freezeDeep(source.object as O), presentation: Object.freeze({
    ...freezeDeep(presentation), view: definition.view,
    actions: Object.freeze(actions.map(action => Object.freeze({ ...action }))) as {
      readonly [K in keyof A]: A[K];
    },
  }) });
}
```

## src/views/authoring-ports.ts

Source SHA-256: 9f975b3e7c945e8b6be010878dd5ba69c27564d00a3f0c27360a22b8c71e6799

```ts
import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { closed, name } from "./definition.ts";
import { ViewBoundContentSchema } from "./schema.ts";

const PortsSchema = closed({
  inputs: Type.Record(name, Type.Index(ViewBoundContentSchema, ["kind"]),
    { additionalProperties: false, maxProperties: 64 }),
  outputs: Type.Array(name, { uniqueItems: true, maxItems: 64 }),
});
type Ports = Frozen<Static<typeof PortsSchema>>;
type PortReferences<P extends Ports> = {
  readonly inputs: { readonly [K in keyof P["inputs"]]: { readonly kind: P["inputs"][K]; readonly input: K } };
  readonly outputs: P["outputs"];
  readonly output: { readonly [K in P["outputs"][number]]: K };
};

/** Names live here once; consumers select typed properties, never duplicate literals. */
export function viewPorts<const P extends Ports>(definition: P & Record<Exclude<keyof P, keyof Ports>, never>): PortReferences<P> {
  const source = jsonSnapshot(definition);
  if (!Check(PortsSchema, source)) throw new Error("INVALID_VIEW_PORTS");
  const inputs = Object.fromEntries(Object.entries(source.inputs).map(([input, kind]) => [input, { kind, input }]));
  const output = Object.fromEntries(source.outputs.map(name => [name, name]));
  return freezeDeep({ inputs, outputs: source.outputs, output }) as PortReferences<P>;
}
```

## src/views/reference-helpers.ts

Source SHA-256: c823d70992df38cf4f458853ed6ac26c6f8bb77d7dfa9e685b96a2c1bfdcb5c5

```ts
import { Check } from "@sinclair/typebox/value";
import type { Static } from "@sinclair/typebox";
import { ProductDefinitionSchema, type ObjectDefinition } from "../contracts.ts";
import type { FieldKey } from "../authoring-types.ts";
import { CommandSchema, type CommandDefinition } from "../program-grammar.ts";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { FactReferenceSchema } from "./object-presentation.ts";
import type { AuthoredView, ViewTarget } from "../modules/authored-types.ts";
import type { ModuleReference, ReferenceContract } from "../modules/reference-types.ts";
import { authoredView, viewTargetDefinition } from "./authored-view.ts";
import { publicReference } from '../modules/references.ts';

type FactReferenceShape = Static<typeof FactReferenceSchema>;
export type FactReference<Id extends FactReferenceShape["object"] = FactReferenceShape["object"],
  Field extends FactReferenceShape["field"] = FactReferenceShape["field"]> =
  Frozen<FactReferenceShape & { object: Id; field: Field }>;
type Output<V> = V extends ModuleReference<"view"> ? Output<ReferenceContract<V>>
  : V extends { readonly outputs: readonly (infer O extends string)[] } ? O : never;

export function factReference<const O extends ObjectDefinition, const F extends FieldKey<NoInfer<O>>>(object: O, field: F):Readonly<{object:O['id'];field:F}>;
export function factReference<const O extends ModuleReference<'object',string,string,Frozen<ObjectDefinition>>,
  const F extends Extract<keyof ReferenceContract<NoInfer<O>>['facts'],string>>(object:O,field:F):Readonly<{object:O['id'];field:F}>;
export function factReference(object: ObjectDefinition | ModuleReference<'object'>, field: string) {
  const referenced=publicReference(object,'object');
  let definition:unknown=object;
  if(referenced){
    // A genuine public object can carry its presentation; facts retain the same
    // domain contract and do not require a consumer to import private definitions.
    const {presentation,...contract}=referenced.value as ObjectDefinition&{presentation?:unknown};
    definition=contract;
  }
  const snapshot = jsonSnapshot(definition);
  if (!Check(ProductDefinitionSchema.properties.objects.items, snapshot) || !Object.hasOwn(snapshot.facts, field)) {
    throw new Error("UNKNOWN_FACT_REFERENCE");
  }
  return Object.freeze({ object: snapshot.id, field });
}

/** References the declared output; the journey still supplies its meaning. */
export function viewOutput<const V extends ViewTarget, const O extends Output<NoInfer<V>>>(definition: V, output: O) {
  const snapshot = viewTargetDefinition(definition);
  if (!Array.isArray(snapshot.outputs) || !snapshot.outputs.includes(output)) throw new Error("UNKNOWN_VIEW_OUTPUT_REFERENCE");
  return Object.freeze({ view: definition, output });
}

/** The program additionally checks the authorized source read and compatible fact types. */
export function initializeInput<const C extends CommandDefinition, const I extends NoInfer<C>["input"][number],
  const F extends FactReference<NoInfer<C>["object"]>>(command: C, input: I, fact: F) {
  const snapshot = { command: jsonSnapshot(command), fact: jsonSnapshot(fact) };
  if (!Check(CommandSchema, snapshot.command) || !snapshot.command.input.includes(input)) {
    throw new Error("UNKNOWN_COMMAND_INPUT_REFERENCE");
  }
  if (!Check(FactReferenceSchema, snapshot.fact) || snapshot.fact.object !== snapshot.command.object) {
    throw new Error("FOREIGN_INITIALIZER_FACT");
  }
  return freezeDeep({ input, fact: snapshot.fact.field as F["field"] });
}

/** Starts a creation at the host file picker; admission checks the input's installed file capability. */
export function chooseFile<const C extends CommandDefinition, const I extends NoInfer<C>["input"][number]>(command: C, input: I) {
  const snapshot = jsonSnapshot(command);
  if (!Check(CommandSchema, snapshot) || !snapshot.input.includes(input)) throw new Error("UNKNOWN_COMMAND_INPUT_REFERENCE");
  return Object.freeze({ kind: "file-picker" as const, input });
}
```

## src/views/object-presentation.ts

Source SHA-256: 44c678bda2371e2985f24b30d3d24058e275af024605c4db6e22a018b641de0b

```ts
import { Type, type Static } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import { closed, name, text } from "./definition.ts";
import { ActionIconSchema } from "../interaction/toolbar.ts";

export const FactReferenceSchema = closed({ object: name, field: name });
export const ActionSelectionSchema = closed({ fact: FactReferenceSchema, value: text, label: text });
export const PublishedPresentationSchema = closed({
  view: name, title: FactReferenceSchema,
  actions: Type.Array(closed({ journey: name, icon: ActionIconSchema, selection: Type.Optional(ActionSelectionSchema) }), { uniqueItems: true }),
});
/** Derived from an owned object publication, never an independent product registry. */
export const ObjectPresentationSchema = closed({ object: name, ...PublishedPresentationSchema.properties });
export type ObjectPresentation = Frozen<Static<typeof ObjectPresentationSchema>>;
```

## src/modules/compose.ts

Source SHA-256: a711b8908f7b124027c718dd2741bedd4dced8365022c344f0717a67ba916b60

```ts
import { Check } from "@sinclair/typebox/value";
import { compile } from "../compile.ts";
import { freezeDeep, jsonSnapshot } from "../json.ts";
import { ViewProgramVersion, type ViewProgram } from "../views/program-schema.ts";
import { compileViewProgram } from "../views/program.ts";
import { deriveModuleIndex } from "./product-index.ts";
import { DeclaredProductCompositionSchema, ProductCompositionSchema } from "./schema.ts";
import { requireMessageCatalog } from "../messages/catalog.ts";
import { buildLocale } from "../messages/locale.ts";
import { resolveMessages } from "../views/declared.ts";
import { resolvePresentation } from "./presentation.ts";
import { ownershipRegistry, productOwner, validateOwnedDomain, type Owner } from "./ownership.ts";
import type { Closed, ProductComposition } from "./types.ts";
import { canonicalObjects, objectPublications, validateObjectPublications } from "./object-publication.ts";
import type { ProductLinks } from "./links.ts";
import { requireJourneyOwnedSurfaceSemantics } from "../human-exposure.ts";
import { compileExposures } from "./compile-exposures.ts";
import { requireModuleIndex, recordProductModules } from "./module-index.ts";
import { declarationArray, declarationRecord } from "./declaration-data.ts";
import { referenceAdmission } from "./admission.ts";
import { lowerProductReferences } from "./lower-references.ts";
import { viewProgramActivities } from "../activities/presentation.ts";
import { registerCompiledProduct } from "./compiled-product.ts";
import type { ComposedDefinition } from "./composed-definition.ts";

/** Compile one root into the existing domain/runtime and presentation protocols. */
export function composeProduct<const P extends ProductComposition>(definition: Closed<P, ProductComposition> & ProductLinks<NoInfer<P>>) {
  const { messages, ...authored } = declarationRecord(definition);
  const mounted = requireModuleIndex(authored.modules);
  const catalog = requireMessageCatalog(messages);
  for (const value of declarationArray(authored.exposures)) {
    const surface = declarationRecord(value);
    if (surface.kind === "human") requireJourneyOwnedSurfaceSemantics(surface);
  }
  const admission = referenceAdmission(authored, true, mounted);
  const declared = jsonSnapshot({ ...lowerProductReferences(authored, admission), modules: mounted.map(module => module.definition) });
  if (!Check(DeclaredProductCompositionSchema, declared)) throw new Error("INVALID_PRODUCT_COMPOSITION");
  // One bundle per build: the human exposures' locale resolves every message the product and its modules declare.
  const locale = buildLocale(declared.exposures.flatMap(exposure => exposure.kind === "human" ? [exposure.locale] : []));
  const source = resolveMessages(declared, catalog.bundle(locale));
  if (!Check(ProductCompositionSchema, source) || !source.exposures) throw new Error("INVALID_PRODUCT_COMPOSITION");
  const modules = source.modules;
  if (new Set(modules.map(module => module.id)).size !== modules.length) throw new Error("DUPLICATE_MODULE_ID");
  const owners: Owner[] = [
    ...modules.map(module => ({ id: module.id, definition: module, exports: module.exports })),
    { id: productOwner, definition: source },
  ];
  const ownership = ownershipRegistry(owners);
  validateOwnedDomain(source);
  validateObjectPublications(source);
  const definitions = owners.map(owner => owner.definition);
  for (const exposure of source.exposures) for (const id of exposure.journeys) {
    const owner = ownership.registry.get("journeys")!.get(id);
    if (owner && owner.id !== productOwner && !owner.exports?.journeys?.includes(id)) {
      throw new Error("PRIVATE_MODULE_EXPOSURE");
    }
  }
  const domain = {
    id: source.id, objects: canonicalObjects(definitions),
    ...(definitions.some(owner => owner.dependencies !== undefined)
      ? { dependencies: definitions.flatMap(owner => owner.dependencies ?? []) } : {}),
    ...(definitions.some(owner => owner.policies !== undefined)
      ? { policies: definitions.flatMap(owner => owner.policies ?? []) } : {}),
    journeys: definitions.flatMap(owner => (owner.journeys ?? []).flatMap(item => item.execution ? [item.execution] : [])),
    surfaces: compileExposures(source.exposures, definitions),
  };
  const application = compile(domain);
  const presentation = owners.map(owner => resolvePresentation(owner.definition, owner.id, ownership));
  const objects = objectPublications(definitions);
  const program: ViewProgram = {
    version: ViewProgramVersion, productId: source.id, label: source.label,
    workspace: ownership.resolve(source.workspace, "view", productOwner),
    ...(objects.length ? { objects } : {}),
    views: definitions.flatMap(owner => owner.views ?? []),
    journeys: presentation.flatMap(owner => owner.journeys),
    destinations: presentation.flatMap(owner => owner.destinations),
    entry: ownership.resolve(source.entry, "destination", productOwner),
    navigation: source.navigation.map(item => ({ ...item, destination: ownership.resolve(item.destination, "destination", productOwner) })),
  };
  const human = domain.surfaces.filter(surface => surface.kind === "human");
  if (human.length === 0) throw new Error("MISSING_COMPOSITION_HUMAN_SURFACE");
  for (const surface of human) {
    compileViewProgram(program, application.surface(surface.id));
    viewProgramActivities(application, program, surface.id);
  }
  const result = freezeDeep({
    definition: domain as ComposedDefinition<P, typeof domain>,
    viewProgram: program,
    ...deriveModuleIndex(owners, program, domain.surfaces),
  });
  recordProductModules(result.definition, mounted, admission.identities);
  registerCompiledProduct(result, application, result.viewProgram);
  return result;
}
```

## src/messages/catalog.ts

Source SHA-256: eaab29ddc6f58684e36251a2b9f5ab64fb4ae12e21f5a9353ad8be98098af91f

```ts
// Law (plan §14): a human-visible sentence is written once, in its owner's message catalog; declarations name it by key.
// Raises MESSAGE_CATALOG (a malformed bundle), MESSAGE_MISSING (a key absent from the selected locale) and MESSAGE_PARAMETERS.
import { Type, type TLiteral, type TUnion } from "@sinclair/typebox";
import { MessageKeyPattern, type Message } from "../views/definition.ts";

/** One locale's bundle as written in `<locale>.json`: nested segments whose leaves are sentences. */
export type MessageTree = { readonly [segment: string]: string | MessageTree };
type Keys<Tree, Prefix extends string = ""> = { [Segment in keyof Tree & string]:
  Tree[Segment] extends string ? `${Prefix}${Segment}` : Keys<Tree[Segment], `${Prefix}${Segment}.`> }[keyof Tree & string];
export type MessageAccessor<Tree, Prefix extends string = ""> = { readonly [Segment in keyof Tree & string]:
  Tree[Segment] extends string ? Message<`${Prefix}${Segment}`> : MessageAccessor<Tree[Segment], `${Prefix}${Segment}.`> };
export type MessageParameters = Readonly<Record<string, string>>;
/** What a build reads from a catalog: the sentence of each key in one locale. */
export type MessageBundle = Readonly<{ locale: string; text: (message: Message, parameters?: MessageParameters) => string }>;

const localePattern = /^[a-z]{2,3}(?:-[A-Z]{2})?$/;
const segmentPattern = /^[A-Za-z][A-Za-z0-9_]*$/;
const keyPattern = new RegExp(MessageKeyPattern);
const placeholder = /\{([A-Za-z][A-Za-z0-9]*)\}/g;
const catalogs = new WeakSet<object>();
const fail = (code: string, what: string): never => { throw new Error(`${code}: ${what}`); };

/** Every `key → sentence` of one locale's tree, in the tree's order; a malformed tree is MESSAGE_CATALOG. */
export function flattenMessages(locale: string, tree: unknown, prefix = ""): ReadonlyMap<string, string> {
  if (typeof tree !== "object" || tree === null || Array.isArray(tree)) return fail("MESSAGE_CATALOG", `${locale}: ${prefix || "the bundle"} is not an object of segments`);
  const flat = new Map<string, string>();
  for (const [segment, value] of Object.entries(tree)) {
    const key = `${prefix}${segment}`;
    if (!segmentPattern.test(segment)) fail("MESSAGE_CATALOG", `${locale}: ${key} is not a message segment`);
    if (typeof value !== "string") { for (const [child, sentence] of flattenMessages(locale, value, `${key}.`)) flat.set(child, sentence); continue; }
    if (!keyPattern.test(key)) fail("MESSAGE_CATALOG", `${locale}: ${key} needs an owner segment and a meaning segment`);
    if (!/\S/.test(value)) fail("MESSAGE_CATALOG", `${locale}: ${key} is an empty sentence`);
    flat.set(key, value);
  }
  return flat;
}

function substitute(locale: string, key: string, sentence: string, parameters: MessageParameters): string {
  const named = new Set([...sentence.matchAll(placeholder)].map(match => match[1] ?? ""));
  const given = Object.keys(parameters);
  if (given.length !== named.size || given.some(name => !named.has(name))) {
    fail("MESSAGE_PARAMETERS", `${key} in ${locale} takes {${[...named].join("}, {")}}; given ${given.join(", ") || "none"}`);
  }
  return sentence.replace(placeholder, (_, name: string) => parameters[name] ?? "");
}

type AccessorNode = { [segment: string]: AccessorNode | Message };
const isMessage = (node: AccessorNode | Message): node is Message => typeof node.key === "string" && Object.keys(node).length === 1;

/** The frozen tree of messages, one leaf per key; a key that is also another key's segment (two locales disagree) is refused. */
function accessorOf(keys: readonly string[]): AccessorNode {
  const root: AccessorNode = {};
  for (const key of keys) {
    const segments = key.split("."), leaf = segments.pop() ?? "";
    let node = root;
    for (const segment of segments) {
      const next = node[segment] ??= {};
      if (isMessage(next)) return fail("MESSAGE_CATALOG", `${key} extends the key ${next.key}`);
      node = next;
    }
    if (node[leaf]) fail("MESSAGE_CATALOG", `${key} is a key and a segment of another key`);
    node[leaf] = Object.freeze({ key });
  }
  const freeze = (node: AccessorNode): AccessorNode => {
    for (const child of Object.values(node)) if (!isMessage(child)) freeze(child);
    return Object.freeze(node);
  };
  return freeze(root);
}

/** A product's or the SDK's catalog from its bundles (the generated `keys.ts` is the only caller in source). */
export function messageCatalog<const Bundles extends Readonly<Record<string, MessageTree>>>(bundles: Bundles) {
  const locales = new Map<string, ReadonlyMap<string, string>>();
  for (const [locale, tree] of Object.entries(bundles)) {
    if (!localePattern.test(locale)) fail("MESSAGE_CATALOG", `${locale} is not a locale`);
    locales.set(locale, flattenMessages(locale, tree));
  }
  const keys = [...new Set([...locales.values()].flatMap(flat => [...flat.keys()]))].sort();
  const accessor = accessorOf(keys);
  type Key = Keys<Bundles[keyof Bundles]>;
  const keySchema = Type.Union(keys.map(key => Type.Literal(key))) as unknown as TUnion<TLiteral<Key>[]>;
  const bundle = (locale: string): MessageBundle => {
    const flat = locales.get(locale) ?? fail("MESSAGE_MISSING", `no ${locale} bundle; the catalog has ${[...locales.keys()].join(", ") || "none"}`);
    return Object.freeze({ locale, text: (message: Message, parameters: MessageParameters = {}) => {
      const sentence = flat.get(message.key) ?? fail("MESSAGE_MISSING", `${message.key} is not in the ${locale} bundle`);
      return substitute(locale, message.key, sentence, parameters);
    } });
  };
  // `bundles`: the trees as given, so a test witness can extend a product's catalog without restating its sentences.
  const catalog = Object.freeze({ m: accessor as MessageAccessor<Bundles[keyof Bundles]>, keys: Object.freeze(keys) as readonly Key[],
    keySchema, locales: Object.freeze([...locales.keys()]), bundle, bundles });
  catalogs.add(catalog);
  return catalog;
}
/** What a consumer of any catalog reads: its locales and the bundle of one (the composition root resolves through it). */
export type MessageCatalog = Readonly<{ locales: readonly string[]; bundle: (locale: string) => MessageBundle }>;

/** A catalog made by messageCatalog, never a look-alike object (the composition root receives only real catalogs). */
export function requireMessageCatalog(value: unknown): MessageCatalog {
  if (typeof value !== "object" || value === null || !catalogs.has(value)) return fail("MESSAGE_CATALOG", "messages is not a catalog from a generated keys.ts");
  return value as MessageCatalog;
}
```

## src/views/definition.ts

Source SHA-256: 4772636a424add2492a12847bb61f752c4c2f9f5e0871a75a546259123d90bdc

```ts
import { Clone, Type, type TProperties, type TSchema } from "@sinclair/typebox";
import { freezeDeep } from "../json.ts";

// Clone before freezing: canonical schemas remain owned by their modules.
export function immutable<T extends TSchema>(schema: T): T {
  const copy = Clone(schema);
  freezeDeep(copy);
  return copy;
}
export const closed = <P extends TProperties>(properties: P) =>
  immutable(Type.Object(properties, { additionalProperties: false }));
export const name = immutable(Type.String({ pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*$" }));
/** A string a person typed or a product resolved: user data, and the compiled form of a message. */
export const text = immutable(Type.String({ minLength: 1, pattern: "\\S" }));

/** A message key: an owner segment and at least one meaning segment (`notes.title`, `errors.CONTRACT_MISMATCH`). */
export const MessageKeyPattern = "^[a-z][A-Za-z0-9]*(?:\\.[A-Za-z][A-Za-z0-9_]*)+$";
/** A human-visible sentence named by its key in the owner's message catalog (plan §14). Declarations carry only the key;
 * the catalog of the exposure's locale resolves it at build time, and a key absent from that bundle is MESSAGE_MISSING. */
export const message = closed({ key: Type.String({ pattern: MessageKeyPattern }) });
/** The authored value of a `message` field: produced by a generated `m` accessor, never written by hand. */
export type Message<Key extends string = string> = { readonly key: Key };
```

## src/modules/module-index.ts

Source SHA-256: b131d477ae7ed2919960d2b262fce3f9cd55388cc4c0a5f01e5a0833644a21ca

```ts
import { moduleKinds, requireModuleHandle, type LocalEntry, type ModuleRecord } from "./references.ts";
import { declarationArray } from "./declaration-data.ts";
import type { ModuleIndex, RegisteredModule, AnyModuleIndex } from "./types.ts";

const catalogs = new WeakMap<object, readonly ModuleRecord[]>();
const productModules = new WeakMap<object, { modules: readonly ModuleRecord[]; identities: ReadonlyMap<object, LocalEntry> }>();
export function moduleIndex<const M extends readonly RegisteredModule[]>(modules: M): ModuleIndex<M> {
  const registered = declarationArray(modules).map(requireModuleHandle);
  if (new Set(registered.map(module => module.definition.id)).size !== registered.length) throw new Error("DUPLICATE_MODULE_ID");
  const result = Object.create(null) as Record<string, Readonly<Record<string, object>>>;
  for (const kind of [...moduleKinds, "commands"] as const) {
    const entries = Object.create(null) as Record<string, object>;
    for (const module of registered) for (const [alias, reference] of Object.entries(module.exports[kind])) {
      if (Object.hasOwn(entries, alias)) throw new Error("DUPLICATE_MODULE_EXPORT_ALIAS");
      entries[alias] = reference;
    }
    result[kind] = Object.freeze(entries);
  }
  Object.freeze(result);
  catalogs.set(result, Object.freeze(registered));
  return result as ModuleIndex<M>;
}
export function requireModuleIndex(value: unknown): readonly ModuleRecord[] {
  const found = typeof value === "object" && value !== null ? catalogs.get(value) : undefined;
  if (!found) throw new Error("UNREGISTERED_MODULE_CATALOG");
  return found;
}
export function recordProductModules(product: object, modules: readonly ModuleRecord[], identities: ReadonlyMap<object, LocalEntry>): void {
  productModules.set(product, { modules, identities: new Map(identities) });
}
export function requireMountedReference(product: object, module: ModuleRecord): void {
  if (!productModules.get(product)?.modules.includes(module)) throw new Error("UNMOUNTED_MODULE_REFERENCE");
}
export function requireLocalProductDependency(product: object, target: object): void {
  const composition = productModules.get(product);
  if (!composition) return;
  const admitted = composition.identities.get(target);
  if (admitted?.kind !== "dependency") throw new Error("UNREGISTERED_LOCAL_REFERENCE");
  if (Object.getOwnPropertyDescriptor(target, "id")?.value !== admitted.id) throw new Error("MUTATED_DEPENDENCY_REFERENCE");
}
```

## src/modules/types.ts

Source SHA-256: 8dbc9e8f6f836ad1c85f50d75b53f0143eaedd67e7152d11c6670ba0f3de7dbb

```ts
import type { Static } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import type { WithoutSurfaceSemantics } from "../human-exposure.ts";
import type { DeclaredModuleDefinitionSchema, ModuleDefinitionSchema, ModuleExportsSchema, ModuleJourneySchema, OwnedDefinitionsSchema } from "./schema.ts";
import type { AuthoredView, AuthoredViewDestination, AuthoredViewJourney, AuthoredViewNavigationEntry, DestinationTarget, ExposedJourney, ViewTarget } from "./authored-types.ts";
import type { ModuleReference, ModuleReferenceKind } from "./reference-types.ts";
import type { JourneyDefinition } from "../program-grammar.ts";
import type { Declared } from "../views/declared.ts";
import type { Message } from "../views/definition.ts";
import type { MessageCatalog } from "../messages/catalog.ts";

export type { AuthoredView, AuthoredViewDestination, AuthoredViewJourney, AuthoredViewNavigationEntry } from "./authored-types.ts";
export type { ModuleReference, ModuleReferenceKind } from "./reference-types.ts";
export type OwnedDefinitions = Frozen<Static<typeof OwnedDefinitionsSchema>>;
export type ResolvedModuleDefinition = Frozen<Static<typeof ModuleDefinitionSchema>>;
/** A registered module as declared: its human text is still messages (plan §14). */
export type DeclaredModuleDefinition = Frozen<Static<typeof DeclaredModuleDefinitionSchema>>;
export type ModuleExports = Frozen<Static<typeof ModuleExportsSchema>>;
export type ModuleEntryKind = keyof ModuleExports;
type ResolvedJourney = Frozen<Static<typeof ModuleJourneySchema>>;
type DeclaredLabel<V> = V extends string ? Message : V;
type AuthoredJourney<J> = J extends ResolvedJourney ? {
  readonly [K in keyof J]: K extends "presentation" ? AuthoredViewJourney | Extract<J[K], undefined> : K extends "label" ? DeclaredLabel<J[K]> : J[K];
} : never;
export type ModuleJourney = AuthoredJourney<ResolvedJourney>;
type ResolvedObject = NonNullable<OwnedDefinitions["objects"]>[number];
type Presentation = NonNullable<ResolvedObject["presentation"]>;
export type PublishedObject = Omit<ResolvedObject, "presentation"> & { readonly presentation?: Omit<Presentation, "view" | "actions" | "fields"> & {
  readonly fields?: Declared<Presentation["fields"]>;
  readonly view: AuthoredView; readonly actions: readonly { readonly journey: Frozen<JourneyDefinition>; readonly icon: Presentation["actions"][number]["icon"] }[];
} };
export type AuthoredOwnedDefinitions = Omit<OwnedDefinitions, "objects" | "journeys" | "views" | "destinations"> & {
  readonly objects?: readonly PublishedObject[]; readonly journeys?: readonly ModuleJourney[];
  readonly views?: readonly AuthoredView[]; readonly destinations?: readonly AuthoredViewDestination[];
};
type ExportTargets = {
  objects: PublishedObject; dependencies: NonNullable<OwnedDefinitions["dependencies"]>[number];
  journeys: Frozen<JourneyDefinition> | AuthoredViewJourney; views: AuthoredView; destinations: AuthoredViewDestination;
};
export type AuthoredExports = { readonly [K in ModuleEntryKind]?: Readonly<Record<string, ExportTargets[K]>> };
export type ModuleDefinition = AuthoredOwnedDefinitions & { readonly id: string; readonly exports?: AuthoredExports };
declare const registeredModule: unique symbol;
export type RegisteredModule<M extends ModuleDefinition = ModuleDefinition> = Readonly<{ id: M["id"]; [registeredModule]: M }>;
export type ModuleSource<M> = M extends RegisteredModule<infer D> ? D : never;
type Registration<M, Target> = M extends { readonly journeys: readonly (infer J)[] }
  ? J extends { readonly execution: infer E } ? Target extends E ? J : never
    : J extends { readonly presentation: infer P } ? Target extends P ? J : never : never
  : never;
type Identity<T> = T extends { readonly id: infer Id extends string } ? Id : never;
type PublicMap<M, K extends ModuleEntryKind> = M extends ModuleDefinition
  ? M extends { readonly exports: { readonly [P in K]: infer Exports } } ? {
    readonly [Alias in keyof Exports]: ModuleReference<K extends "dependencies" ? "dependency" : Extract<K, `${string}s`> extends `${infer Kind}s` ? Extract<Kind, ModuleReferenceKind> : never,
      M["id"], Identity<Exports[Alias]>, K extends "journeys" ? Registration<M, Exports[Alias]> : Exports[Alias]>;
  } : {} : never;
type Commands<M> = M extends ModuleDefinition
  ? M extends { readonly exports: { readonly journeys: infer Exports } } ? {
    readonly [Alias in keyof Exports as Exports[Alias] extends { readonly kind: "mutation" } ? Alias : never]:
      Exports[Alias] extends { readonly command: infer C } ? ModuleReference<"command", M["id"], Identity<C>, C> : never;
  } : {} : never;
type Merge<U> = [U] extends [never] ? {} : (U extends unknown ? (value: U) => void : never) extends (value: infer I) => void ? I : never;
declare const registeredIndex: unique symbol;
export type ModuleIndex<M extends readonly RegisteredModule[] = readonly RegisteredModule[]> = Readonly<{
  [registeredIndex]: M;
}> & { readonly [K in ModuleEntryKind]: Merge<PublicMap<ModuleSource<M[number]>, K>> } & {
  readonly commands: Merge<Commands<ModuleSource<M[number]>>>;
};
export type AnyModuleIndex = Readonly<{ [registeredIndex]: readonly RegisteredModule[] }>;
export type CatalogSource<C extends AnyModuleIndex> = ModuleSource<C[typeof registeredIndex][number]>;
export type AuthoredExposure = ({ readonly id: string; readonly kind: "human"; readonly locale: string; readonly journeys: readonly ExposedJourney[] } & WithoutSurfaceSemantics)
  | { readonly id: string; readonly kind: "agent"; readonly journeys: readonly ExposedJourney[] };
export type ProductComposition = AuthoredOwnedDefinitions & {
  readonly id: string; readonly label: Message; readonly messages: MessageCatalog; readonly modules: AnyModuleIndex; readonly exposures: readonly AuthoredExposure[];
  readonly workspace: ViewTarget;
  readonly entry: DestinationTarget; readonly navigation: readonly AuthoredViewNavigationEntry[];
};
export type Closed<T, Shape> = T & Record<Exclude<keyof T, keyof Shape>, never>;
```

## src/views/components.ts

Source SHA-256: 990021e37efeb22709f16f2cb6e60ac2afcc6358aaf2f2498ab526fa66bf8534

```ts
import type { DeclaredViewBoundContent, DeclaredViewItem, DeclaredViewStack, DeclaredViewToolbar } from "./schema.ts";
import { declarationArray, declarationRecord } from "../modules/declaration-data.ts";
import { viewDock } from "./define-view.ts";
import { contentBuilder, createComponent, emptyComponent, requireComponent,
  type Exact, type ViewComponent } from "./component-values.ts";

type InputKind = DeclaredViewBoundContent["kind"];
type InputReference<Kind extends InputKind> = { readonly kind: Kind; readonly input: string };
type BoundProperties<Kind extends InputKind> = { readonly input: InputReference<Kind> }
  & (Kind extends "collection" ? Pick<Extract<DeclaredViewBoundContent, { kind: "collection" }>, "output" | "presentation" | "fields">
    : Kind extends "context" ? Pick<Extract<DeclaredViewBoundContent, { kind: "context" }>, "fields" | "presentation"> : object);

function boundComponent<Kind extends InputKind>(kind: Kind) {
  return <const Props extends BoundProperties<Kind>>(properties: Exact<Props, BoundProperties<Kind>>) => {
    const source = declarationRecord(properties);
    const port = declarationRecord(source.input);
    if (Object.keys(port).some(key => key !== "kind" && key !== "input") || port.kind !== kind) {
      throw new Error("INVALID_COMPONENT_INPUT");
    }
    return createComponent<Extract<DeclaredViewBoundContent, { kind: Kind }>>(kind, { ...source, input: port.input }) as unknown as
      ViewComponent<{ readonly kind: Kind; readonly id: string; readonly input: Props["input"]["input"] } & Omit<Props, "input">>;
  };
}

type StackProperties = Omit<DeclaredViewStack, "kind" | "id" | "items"> & { readonly items: readonly ViewComponent<DeclaredViewItem>[] };
function stack<const Props extends StackProperties>(properties: Exact<Props, StackProperties>) {
  const source = declarationRecord(properties);
  declarationArray(source.items).forEach(requireComponent);
  return createComponent<DeclaredViewStack>("stack", source) as ViewComponent<{ readonly kind: "stack"; readonly id: string } & Props>;
}
type ToolbarProperties = Omit<DeclaredViewToolbar, "kind">;
type ToolbarAction = DeclaredViewToolbar["actions"][number];
type ActionKeys<Action> = Action extends unknown ? keyof Action : never;
type ClosedActions<Actions extends readonly ToolbarAction[]> = {
  readonly [Index in keyof Actions]: Actions[Index] &
    Record<Exclude<ActionKeys<Actions[Index]>, keyof ToolbarAction>, never>;
};
function toolbar<const Props extends ToolbarProperties>(properties: Exact<Props, ToolbarProperties> & {
  readonly actions: ClosedActions<Props["actions"]>;
}) {
  return createComponent<DeclaredViewToolbar>("toolbar", properties) as ViewComponent<{ readonly kind: "toolbar" } & Props>;
}

export const ViewTitles = Object.freeze({
  product: Object.freeze({ kind: "product-title" as const }),
  subject: Object.freeze({ kind: "subject-title" as const }),
  operation: Object.freeze({ kind: "operation-label" as const }),
  greeting: Object.freeze({ kind: "greeting" as const }),
});

export const Components = Object.freeze({
  Header: contentBuilder("header"), Stack: stack,
  Text: contentBuilder("text"), Fact: contentBuilder("fact"),
  DestinationLink: contentBuilder("destination-link"),
  Tag: contentBuilder("tag"), Image: contentBuilder("image"), Avatar: contentBuilder("avatar"),
  Collection: boundComponent("collection"), Form: boundComponent("form"), Context: boundComponent("context"),
  MediaLibrary: contentBuilder("media-library"), VisualCatalog: emptyComponent("visual-catalog"),
  Appearance: emptyComponent("appearance"), SystemStatus: emptyComponent("system-status"),
  Identity: emptyComponent("identity"), Attention: emptyComponent("attention"),
  Navigation: emptyComponent("navigation"), Destination: emptyComponent("destination"),
  Toolbar: toolbar, Dock: viewDock,
});

export { defineView } from "./define-view.ts";
```

## src/views/define-view.ts

Source SHA-256: 643478f7399fc731f537beaa2b6e1cf57bcf524b73fa8dff660d45f852ae52c6

```ts
import type { AuthoredView, AuthoredViewRef, ViewTarget } from "../modules/authored-types.ts";
import { declarationArray, declarationRecord } from "../modules/declaration-data.ts";
import { authoredView, viewTargetDefinition } from "./authored-view.ts";
import { ViewVersion, type DeclaredViewContent, type DeclaredViewToolbar } from "./schema.ts";
import { placeComponent, requireComponent, type ComponentNode, type Exact, type ViewComponent } from "./component-values.ts";
import { registerDefinedView } from "./defined-view-registry.ts";

declare const dock: unique symbol;
export type ViewDock<Target extends ViewTarget = ViewTarget> = Omit<AuthoredViewRef, "view"> & {
  readonly view: Target; readonly [dock]: true;
};
const docks = new WeakSet<object>();

export function viewDock<const Target extends ViewTarget>(target: Target): ViewDock<Target> {
  viewTargetDefinition(target);
  const result = Object.freeze({ kind: "view" as const, view: target });
  docks.add(result);
  return result as ViewDock<Target>;
}

export type ViewDeclaration = {
  readonly name: string;
  readonly layout?: "overview" | "gallery";
  readonly outputs?: readonly string[];
  readonly topDock?: ViewComponent<DeclaredViewToolbar>;
  readonly bottomDock?: ViewComponent<DeclaredViewToolbar>;
  readonly leftDock?: ViewDock;
  readonly rightDock?: ViewDock;
  readonly content: readonly ViewComponent<DeclaredViewContent>[];
};
type DefinedContent<Content extends readonly ViewComponent<DeclaredViewContent>[]> = {
  readonly [Index in keyof Content]: ComponentNode<Content[Index]>;
};
type DefinedView<Definition extends ViewDeclaration> = Omit<Definition, "name" | "content"> & {
  readonly version: typeof ViewVersion;
  readonly id: Definition["name"];
  readonly content: DefinedContent<Definition["content"]>;
};
type ComponentOutputs<Component> =
  Component extends { readonly kind: "toolbar"; readonly actions: readonly { readonly output: infer Output extends string }[] } ? Output :
  Component extends { readonly kind: "collection" | "destination-link"; readonly output: infer Output extends string } ? Output :
  Component extends { readonly kind: "stack"; readonly items: readonly (infer Item)[] } ? ComponentOutputs<Item> : never;
type ReferencedOutputs<Definition extends ViewDeclaration> = ComponentOutputs<Definition["content"][number]>
  | ComponentOutputs<Definition["topDock"]> | ComponentOutputs<Definition["bottomDock"]>;
type DeclaredOutputs<Definition> = Definition extends { readonly outputs: readonly (infer Output extends string)[] } ? Output : never;
type UnboundOutputs<Definition extends ViewDeclaration> = Definition extends unknown ?
  [ReferencedOutputs<Definition>] extends [never] ? never :
  string extends DeclaredOutputs<Definition> ? string :
  Exclude<ReferencedOutputs<Definition>, DeclaredOutputs<Definition>> : never;
type BoundOutputs<Definition extends ViewDeclaration> = [UnboundOutputs<Definition>] extends [never] ? unknown : never;

export function defineView<const Definition extends ViewDeclaration>(
  definition: Exact<Definition, ViewDeclaration> & NoInfer<BoundOutputs<Definition>>,
): DefinedView<Definition> {
  const source = declarationRecord(definition);
  const allowed = new Set(["name", "layout", "outputs", "content", "topDock", "bottomDock", "leftDock", "rightDock"]);
  if (Object.keys(source).some(key => !allowed.has(key))) throw new Error("INVALID_VIEW_DECLARATION");
  for (const key of ["topDock", "bottomDock"]) {
    if (Object.hasOwn(source, key)) requireComponent(source[key]);
  }
  for (const key of ["leftDock", "rightDock"]) {
    if (Object.hasOwn(source, key) && !docks.has(source[key] as object)) throw new Error("UNREGISTERED_VIEW_DOCK");
  }
  const { name, content, ...rest } = source;
  const canonical = { ...rest, version: ViewVersion, id: name,
    content: declarationArray(content).map((item, index) => placeComponent(item as ViewComponent<DeclaredViewContent>, `content.${index}`)) };
  const result = authoredView(canonical as AuthoredView);
  registerDefinedView(result);
  return result as unknown as DefinedView<Definition>;
}
```

## src/activities/authoring.ts

Source SHA-256: a425dd58134f371387993bf4c0a466604eb102bbbc3324849f16ccae90418f18

```ts
import type { ViewTarget } from "../modules/authored-types.ts";
import { declarationArray, declarationRecord } from "../modules/declaration-data.ts";
import { ActivityVersion, type ActivityPlan } from "./schema.ts";
import { activityJourney, type ActivityJourney, type ActivityExecution } from "./references.ts";

declare const inputType: unique symbol;
export type ActivityInput<K extends string = string, J extends string = string> = Readonly<{ [inputType]: { field: K; journey: J } }>;
export type ActivityDefinition<J extends ActivityJourney = ActivityJourney> = {
  readonly journey: J;
  readonly steps: readonly {
    readonly view: ViewTarget;
    readonly inputs: readonly ActivityInput<ActivityExecution<J>["command"]["input"][number], J["id"]>[];
    readonly when?: { readonly input: ActivityInput<ActivityExecution<J>["command"]["input"][number], J["id"]>;
      readonly comparison: "equals" | "not-equals"; readonly value: string | number };
  }[];
  readonly review: ViewTarget;
};
const fields = new WeakMap<object, { journey: object; field: string }>();

export function activityInputs<const J extends ActivityJourney>(journey: J) {
  return Object.freeze(Object.fromEntries(activityJourney(journey).command.input.map(field => {
    const token = Object.freeze({ field });
    fields.set(token, { journey, field });
    return [field, token];
  }))) as unknown as { readonly [K in ActivityExecution<J>["command"]["input"][number]]: ActivityInput<K, J["id"]> };
}

export function authoredActivity(definition: ActivityDefinition,
  resolveJourney: (value: object) => string, resolveView: (value: object) => string): ActivityPlan {
  const source = declarationRecord(definition);
  if (Object.keys(source).some(key => !["journey", "steps", "review"].includes(key))) throw new Error("UNKNOWN_ACTIVITY_SEMANTICS");
  const journey = source.journey as object;
  const resolveInput = (token: unknown) => {
    const field = typeof token === "object" && token !== null ? fields.get(token) : undefined;
    if (!field || field.journey !== journey) throw new Error("UNREGISTERED_ACTIVITY_INPUT");
    return field.field;
  };
  return { version: ActivityVersion, journey: resolveJourney(journey), review: resolveView(source.review as object),
    steps: declarationArray(source.steps).map(value => {
      const step = declarationRecord(value);
      if (Object.keys(step).some(key => !["view", "inputs", "when"].includes(key))) throw new Error("UNKNOWN_ACTIVITY_SEMANTICS");
      const condition = step.when === undefined ? undefined : declarationRecord(step.when);
      if (condition && Object.keys(condition).some(key => !["input", "comparison", "value"].includes(key))) {
        throw new Error("UNKNOWN_ACTIVITY_SEMANTICS");
      }
      return { view: resolveView(step.view as object), inputs: declarationArray(step.inputs).map(resolveInput),
        ...(condition ? { when: { ...condition, input: resolveInput(condition.input) } as NonNullable<ActivityPlan["steps"][number]["when"]> } : {}) };
    }) };
}
```

## src/activities/experience.ts

Source SHA-256: 26a073ec9b487fb59d38f8cd21349fac15428bf7b9bc4bd708639e8d1aa1f9a5

```ts
import type { ActivityDefinition } from "./authoring.ts";
import type { ActivityJourney } from "./references.ts";
import type { ReadJourneyTarget } from "../modules/authored-types.ts";

export function activityExperience<const J extends ActivityJourney, const S extends ReadJourneyTarget>(activity: ActivityDefinition<J>, source: S) {
  return Object.freeze({ id: activity.journey.id, kind: "activity" as const, source, activity,
    preferredDock: "right" as const, outputs: [] as const });
}
```

## src/program-grammar.ts

Source SHA-256: 3f178be436f031d93f31959caff945063373b3394216d9fe5a382a6d5881ca81

```ts
import { Type, type Static } from "@sinclair/typebox";
import { RequirementsSchema } from "./dependencies.ts";
import { FieldRepresentationsSchema } from "./field-representation.ts";
import { ConnectionPolicySchema } from "./connection-policy.ts";

const closed = { additionalProperties: false };
const Name = Type.String({ minLength: 1 });
const Names = Type.Array(Name, { uniqueItems: true });
const Scalar = Type.Union([Type.String(), Type.Integer({ minimum: Number.MIN_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER })]);
const Expression = Type.Union([
  Type.Object({ kind: Type.Literal("input"), field: Name }, closed),
  Type.Object({ kind: Type.Literal("actor") }, closed),
  Type.Object({ kind: Type.Literal("literal"), value: Type.Union([Scalar, Type.Tuple([])]) }, closed),
]);
const Assignments = Type.Record(Name, Expression, { minProperties: 1, ...closed });
const Base = { id: Name, object: Name, input: Names };
export const CommandSchema = Type.Union([
  Type.Object({ ...Base, kind: Type.Literal("create"), values: Assignments }, closed),
  Type.Object({ ...Base, kind: Type.Literal("update"), when: Type.Record(Name, Scalar, closed), set: Assignments }, closed),
]);
export const JourneySchema = Type.Union([
  Type.Object({ id: Name, kind: Type.Literal("mutation"), command: CommandSchema, requires: RequirementsSchema,
    confirmation: Type.Literal("prepared-effect"), outcome: Type.Literal("receipt") }, closed),
  Type.Object({ id: Name, kind: Type.Literal("read"), object: Name, requires: RequirementsSchema,
    where: Type.Optional(Type.Record(Name, Scalar, closed)),
    fields: Type.Array(Name, { minItems: 1, uniqueItems: true }),
    collection: Type.Array(Name, { minItems: 1, uniqueItems: true }) }, closed),
]);
export const PolicySchema = Type.Object({ kind: Type.Literal("ownership"), object: Name, field: Name }, closed);
const SurfaceBase = { id: Name, journeys: Type.Array(Name, { minItems: 1, uniqueItems: true }) };
const HumanSurfaceProperties = {
  ...SurfaceBase, kind: Type.Literal("human"),
  fieldRepresentations: FieldRepresentationsSchema,
  commit: Type.Record(Name, Type.Union([Type.Literal("submit"), Type.Literal("review"), Type.Literal("confirm")]), closed),
  language: Type.Object({ locale: Name, fields: Type.Record(Name, Name, closed), journeys: Type.Record(Name, Name, closed) }, closed),
  connection: ConnectionPolicySchema,
};
export const ViewExposureSchema = Type.Union([
  Type.Object({ ...SurfaceBase, kind: Type.Literal("agent") }, closed),
  Type.Object(HumanSurfaceProperties, closed),
]);
export const ExposureSchema = ViewExposureSchema;

export type CommandDefinition = Static<typeof CommandSchema>;
export type JourneyDefinition = Static<typeof JourneySchema>;
export type ExposureDefinition = Static<typeof ExposureSchema>;
export type PolicyDefinition = Static<typeof PolicySchema>;
export type ExpressionDefinition = Static<typeof Expression>;
```

## src/validation.ts

Source SHA-256: e02bb617747128ddd89dac54feb2cd74affeeda742a9a0603078caa074e50d61

```ts
import { Ajv } from "ajv";
import { freezeDeep, jsonSnapshot } from "./json.ts";
import { inspectValidation } from "./validation-result.ts";

const engine = new Ajv({
  strict: true, allErrors: true, ownProperties: true,
  coerceTypes: false, removeAdditional: false, useDefaults: false,
});

export function createSchemaValidator<T>(schema: object) {
  return engine.compile<T>(schema);
}

// Schemas are trusted compiled artifacts, not arbitrary remote packages.
export function createShapeValidator(schema: object) {
  const snapshot = jsonSnapshot(schema);
  if (typeof snapshot !== "object" || snapshot === null || Array.isArray(snapshot)) {
    throw new Error("Expected an object schema");
  }
  freezeDeep<object>(snapshot);
  const validate = createSchemaValidator(snapshot);
  return (value: unknown) => inspectValidation(validate, value);
}
```

## src/local.ts

Source SHA-256: 4d245324f27527924052170f1e04724b0e710a72de3a8bc1f51a0afc2486f9d2

```ts
export { openLocalController } from "./local/controller.ts";
export type { LocalDatabase } from "./local/database.ts";
export type { LocalSession } from "./local/session.ts";
export type { LocalAvailabilityOptions } from "./local/availability.ts";
export type { PrepareOptions } from "./prepare-options.ts";
```

## src/prepare-options.ts

Source SHA-256: 9210ee66d27fd30b86dee09dd8be6a812a8b81c9ae2db7b8b9500b04f4527c2e

```ts
import { Type, type Static } from "@sinclair/typebox";
import { jsonSnapshot, type Frozen } from "./json.ts";
import { createSchemaValidator } from "./validation.ts";

/** Execution metadata is separate from the command's authored business input. */
export const PrepareOptionsSchema = Type.Object({
  expectedVersion: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }),
}, { additionalProperties: false });
export type PrepareOptions = Frozen<Static<typeof PrepareOptionsSchema>>;
const validate = createSchemaValidator(PrepareOptionsSchema);

export function snapshotPrepareOptions(input: unknown): PrepareOptions {
  try {
    const snapshot = jsonSnapshot(input);
    if (!validate(snapshot)) throw new Error("Invalid options");
    return snapshot as PrepareOptions;
  } catch { throw new Error("INVALID_EDIT_BASE"); }
}
```

## src/local/controller.ts

Source SHA-256: cdc1c09de857cccf70d3f8ea0291f4b6c1f385fd687be57a4bf620441490c03a

```ts
import { localDatabase, type LocalDatabase } from "./database.ts";
import { localProgram, type Application } from "./program.ts";
import { identityAdministration } from "./identity.ts";
import { localSession } from "./session.ts";
import { requireActivityCatalog, type ActivityIndex } from "../activities/activity-index.ts";
import { humanIdentityAccess } from "../identity/access.ts";
import { rememberController } from "./controller-binding.ts";
import { privateImageHost, type PrivateImageStorage } from "../assets/host.ts";
import { requirePrivateImageMechanism } from "../assets/requirements.ts";
import { loadDefinition } from "../compiled-definition.ts";

export async function openLocalController(application: Application, options: LocalDatabase & {
  roles: readonly string[], runLifetimeMs?: number, activities?: ActivityIndex, privateImages?: PrivateImageStorage,
}) {
  const program = localProgram(application, options.roles);
  requirePrivateImageMechanism(program, options.privateImages !== undefined);
  const activities = options.activities === undefined ? undefined : requireActivityCatalog(options.activities, application);
  const lifetime = options.runLifetimeMs ?? 5 * 60 * 1000;
  if (!Number.isSafeInteger(lifetime) || lifetime <= 0 || lifetime > 86400000) throw new Error("INVALID_RUN_LIFETIME");
  // Declared uniqueness is enforced by the typed object tables (src/storage/ddl.ts). Until the runtime stores objects
  // there (plan §15, slice 7.2) a product that declares it is refused rather than served without the guarantee.
  const unique = loadDefinition(application).objects.find(object => object.unique);
  if (unique) throw new Error(`UNIQUE_NOT_YET_ENFORCED: ${unique.id}: declared unique facts need typed object storage (slice 7.2)`);
  const database = localDatabase(options);
  try { await database.install(application.id, application.digest, program.roles); }
  catch (error) { await database.close(); throw error; }
  const images = await (options.privateImages ? privateImageHost(database, options.privateImages) : Promise.resolve(undefined))
    .catch(async error => { await database.close(); throw error; });
  const controller = Object.freeze({
    status: "local-executor" as const,
    productId: application.id,
    contractDigest: application.digest,
    identities: identityAdministration(database),
    access: humanIdentityAccess(database),
    connect(token: string, surface: string) { return localSession(database, program, token, surface, lifetime, activities, images); },
    async close() { try { await images?.close(); } finally { await database.close(); } },
  });
  rememberController(controller, application, program.roles, activities?.digest);
  return controller;
}
export type LocalController = Awaited<ReturnType<typeof openLocalController>>;
```

## src/local/session.ts

Source SHA-256: 84320c32740753faca1a7cc379379eae8680ce0477ce351f17263bf975860252

```ts
import type { PoolClient } from "pg";
import { jsonSnapshot } from "../json.ts";
import { authenticate } from "./identity.ts";
import { beginJourney, readJourney } from "./admission.ts";
import { prepareMutation } from "./prepare.ts";
import { acceptMutation, recoverReceipt } from "./accept.ts";
import type { Database } from "./database.ts";
import type { LocalProgram } from "./program.ts";
import { requireInstallation } from "./installation.ts";
import { watchLocalAvailability, type LocalAvailabilityOptions } from "./availability.ts";
import { inspectOffer } from "./offer.ts";
import { rememberSession } from "./session-binding.ts";
import { snapshotPrepareOptions, type PrepareOptions } from "../prepare-options.ts";
import { snapshotPreflightOptions, type PreflightOptions } from "../preflight.ts";
import { preflightMutation } from "./preflight.ts";
import { requireActivityCatalog, type ActivityIndex } from "../activities/activity-index.ts";
import { activityRecord, activitySnapshot } from "../activities/records.ts";
import { answerActivity, cancelActivity, reopenActivity } from "../activities/drafts.ts";
import { createActivity } from "../activities/create.ts";
import { listActivities, snapshotActivityListOptions } from "../activities/discovery.ts";
import type { ActivityListOptions } from "../activities/schema.ts";
import { prepareActivity } from "../activities/prepare.ts";
import { readActivity } from "../activities/read.ts";
import { privateImageSession } from "../assets/session.ts";
import type { PrivateImageHost } from "../assets/host.ts";

export function localSession(database: Database, program: LocalProgram, token: string, surface: string, lifetime: number,
  activities?: ActivityIndex, images?: PrivateImageHost) {
  database.assertOpen();
  program.application.surface(surface);
  const transact = <T>(operation: (client: PoolClient, actor: string) => Promise<T>, readOnly = false) =>
    database.transaction(async client => {
      await requireInstallation(client, { product: program.application.id, digest: program.application.digest, roles: program.roles }, !readOnly);
      const result = await operation(client, await authenticate(client, token, !readOnly));
      await authenticate(client, token, !readOnly);
      return result;
    }, readOnly);
  const session = Object.freeze({
    ...privateImageSession(transact, program, surface, images),
    activityCreate(occurrence: string, plan: unknown, options: PreflightOptions = {}) {
      const catalog = requireActivityCatalog(activities, program.application), snapshot = jsonSnapshot(plan);
      const metadata = snapshotPreflightOptions(options);
      return transact((client, actor) => createActivity(client, program, catalog, actor, surface, occurrence, snapshot, metadata));
    },
    async activityList(options: ActivityListOptions = {}) {
      const catalog = requireActivityCatalog(activities, program.application);
      const snapshot = snapshotActivityListOptions(options);
      return transact((client, actor) => listActivities(client, program, catalog, actor, surface, snapshot), true);
    },
    activityRead(id: string) {
      const catalog = requireActivityCatalog(activities, program.application);
      return transact((client, actor) => readActivity(client, program, catalog, actor, surface, id));
    },
    activityAnswer(id: string, revision: number, step: number, input: unknown) {
      const catalog = requireActivityCatalog(activities, program.application), snapshot = jsonSnapshot(input);
      return transact((client, actor) => answerActivity(client, program, catalog, actor, surface, id, revision, step, snapshot));
    },
    activityReopen(id: string, revision: number, step: number) {
      const catalog = requireActivityCatalog(activities, program.application);
      return transact((client, actor) => reopenActivity(client, program, catalog, actor, surface, id, revision, step));
    },
    activityPrepare(id: string, revision: number) {
      const catalog = requireActivityCatalog(activities, program.application);
      return transact((client, actor) => prepareActivity(client, program, catalog, actor, surface, id, revision, lifetime));
    },
    activityCancel(id: string, revision: number) {
      const catalog = requireActivityCatalog(activities, program.application);
      return transact((client, actor) => cancelActivity(client, program, catalog, actor, surface, id, revision));
    },
    async preflight(journeyId: string, input: unknown, options: PreflightOptions = {}) {
      const snapshot = jsonSnapshot(input);
      const metadata = snapshotPreflightOptions(options);
      return transact((client, actor) => preflightMutation(client, program, actor, surface, journeyId, snapshot, metadata), true);
    },
    offer(journeyId: string, subject: string) {
      return transact((client, actor) => inspectOffer(client, program, actor, surface, journeyId, subject));
    },
    watchAvailability(options?: LocalAvailabilityOptions) {
      return watchLocalAvailability(database, program, token, surface, options);
    },
    begin(journeyId: string, subject?: string) {
      return transact((client, actor) => beginJourney(client, program, actor, surface, journeyId, subject, lifetime));
    },
    read(runId: string) {
      return transact((client, actor) => readJourney(client, program, actor, surface, runId));
    },
    async prepare(runId: string, input: unknown, options?: PrepareOptions) {
      const snapshot = jsonSnapshot(input);
      const base = options === undefined ? undefined : snapshotPrepareOptions(options);
      return transact((client, actor) => prepareMutation(client, program, actor, surface, runId, snapshot, base, images?.store.id));
    },
    accept(intentId: string, confirmationDigest: string) {
      return transact((client, actor) => acceptMutation(client, program, actor, surface, intentId, confirmationDigest, activities, images?.store.id));
    },
    receipt(intentId: string) {
      return transact((client, actor) => recoverReceipt(client, program, actor, surface, intentId));
    },
  });
  rememberSession(session, { application: program.application, surface, roles: program.roles,
    ...(activities ? { activitiesDigest: activities.digest } : {}) });
  return session;
}
export type LocalSession = ReturnType<typeof localSession>;
```

## src/local/identity.ts

Source SHA-256: a300fcd20e86308e675cb34a9af1af07419a8f4ab2403abe6f1d7c5dbb9f1778

```ts
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { Database } from "./database.ts";
import { humanSession } from "../identity/sessions.ts";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function authenticate(client: PoolClient, token: string, lock = true): Promise<string> {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("UNAUTHENTICATED");
  const human = await humanSession(client, token, lock);
  if (human) return human.id;
  const { rows: [identity] } = await client.query(
    `SELECT id, revoked, expires_at FROM desert_identities i WHERE credential_hash = $1
      AND NOT EXISTS (SELECT 1 FROM desert_identity_accounts a WHERE a.identity_id = i.id)${lock ? " FOR SHARE" : ""}`, [hash(token)]);
  const { rows: [clock] } = await client.query("SELECT clock_timestamp() AS time");
  if (!identity || identity.revoked || identity.expires_at <= clock.time) throw new Error("UNAUTHENTICATED");
  return identity.id;
}

export function identityAdministration(database: Database) {
  return Object.freeze({
    async issue(label: string, validForMs = 30 * 24 * 60 * 60 * 1000) {
      if (typeof label !== "string" || !label.trim() || label.length > 200) throw new Error("INVALID_IDENTITY_LABEL");
      if (!Number.isSafeInteger(validForMs) || validForMs <= 0) throw new Error("INVALID_IDENTITY_LIFETIME");
      const id = randomUUID();
      const token = randomBytes(32).toString("base64url");
      await database.transaction(client => client.query(`INSERT INTO desert_identities
        (id, label, credential_hash, expires_at) VALUES ($1, $2, $3, clock_timestamp() + $4 * interval '1 millisecond')`,
      [id, label, hash(token), validForMs]));
      return Object.freeze({ id, token });
    },
    async revoke(id: string) {
      await database.transaction(client => client.query("UPDATE desert_identities SET revoked = true WHERE id = $1", [id]));
    },
  });
}
```

## src/web/build.ts

Source SHA-256: 6bbfaf639341e4757f26e4257e5925927c26718e407fdebbb7385c6bc7999742

```ts
import { Ajv } from "ajv";
import standaloneModule from "ajv/dist/standalone/index.js";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import type { compile } from "../compile.ts";
import { requireCatalog } from "../interaction/catalog.ts";
import { deriveForm } from "../interaction/form.ts";
import { compileViewProgram } from "../views/program.ts";
import { productViewProgram } from "../modules/compiled-product.ts";
import { requireFieldPresentation } from "../field-representation.ts";
import { viewProgramActivities } from "../activities/presentation.ts";
import { rendererLocale } from "../messages/renderer-locale.ts";

export async function buildHumanModule(application: ReturnType<typeof compile>, surfaceId: string) {
  if (arguments.length > 2) throw new Error("VIEW_PROGRAM_OVERRIDE_FORBIDDEN");
  const surface = application.surface(surfaceId);
  if (surface.kind !== "human") throw new Error("HUMAN_SURFACE_REQUIRED");
  requireCatalog(surface.catalog);
  if (surface.language?.locale !== rendererLocale) throw new Error("UNSUPPORTED_RENDERER_LANGUAGE");
  const fieldPresentation = requireFieldPresentation(surface.fieldRepresentations, surface.fieldKinds, Object.keys(surface.language.fields));
  const viewProgram = compileViewProgram(productViewProgram(application), surface);
  viewProgramActivities(application, viewProgram, surfaceId);
  const engine = new Ajv({ strict: true, allErrors: true, ownProperties: true,
    coerceTypes: false, removeAdditional: false, useDefaults: false, code: { source: true, esm: true } });
  const exports: Record<string, string> = {};
  const commands = new Map<string, string>();
  for (const journey of surface.journeys) {
    if (journey.kind !== "mutation" || commands.has(journey.commandId)) continue;
    deriveForm(journey, fieldPresentation.fieldRepresentations);
    const name = `desertInputValidator${commands.size}`;
    engine.addSchema(journey.inputSchema, journey.commandId);
    exports[name] = journey.commandId;
    commands.set(journey.commandId, name);
  }
  const standalone = standaloneModule as unknown as (engine: Ajv, exports: Record<string, string>) => string;
  const generated = standalone(engine, exports);
  const registry = [...commands].map(([id, name]) => `${JSON.stringify(id)}: ${name}`).join(",");
  const source = `import { freezeDeep } from './src/json.ts';
    import { inspectValidation } from './src/validation-result.ts';\n${generated}\nconst validators = {${registry}};
    export const surface = freezeDeep(${JSON.stringify(surface)});
    export const viewProgram = freezeDeep(${JSON.stringify(viewProgram)});
    function inspectInput(commandId, input) {
      if (!Object.hasOwn(validators, commandId)) throw new Error('Unknown command');
      return inspectValidation(validators[commandId], input);
    }
    export const validateInput = Object.assign((commandId, input) => inspectInput(commandId, input).valid,
      { inspect: inspectInput });`;
  const result = await build({ stdin: { contents: source, resolveDir: fileURLToPath(new URL("../../", import.meta.url)) },
    bundle: true, write: false, platform: "browser", format: "esm", target: "es2022" });
  return result.outputFiles[0]!.text;
}
```

## src/views/schema.ts

Source SHA-256: 611a90455d0e91ca1930f28d68be006e60fc2e842e1d874f135d9479c4c19b32

```ts
import { Type, type Static } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import { InformationItemSchema } from "../interaction/information-content.ts";
import { TagNodeSchema, ImageNodeSchema, AvatarNodeSchema } from "../interaction/extended-nodes.ts";
import { ActionIconSchema } from "../interaction/toolbar.ts";
import { FeaturedMediaSchema } from "../public-catalog/schema.ts";
import { closed, immutable, name, text } from "./definition.ts";
import { MediaLibrarySchema } from "./media-library.ts";
import { FactReferenceSchema } from "./object-presentation.ts";
import { declaredSchema, type Declared } from "./declared.ts";

export const ViewVersion = "desert.view/1" as const;
export const ViewLimits = Object.freeze({
  catalogSize: 64, referenceDepth: 16, expandedViews: 1024,
  inputDepth: 32, inputNodes: 16384,
});

/** Read-only canonical leaves only. Action, input and journey nodes are not accepted. */
export const ViewLeafSchema = immutable(Type.Union([
  ...InformationItemSchema.anyOf, TagNodeSchema, ImageNodeSchema, AvatarNodeSchema,
]));
export const ViewHeaderTitleSchema = immutable(Type.Union([
  text, closed({ kind: Type.Literal("subject-title") }), closed({ kind: Type.Literal("operation-label") }),
  closed({ kind: Type.Literal("product-title") }),
  closed({ kind: Type.Literal("greeting") }),
]));
export const ViewHeaderSchema = closed({
  kind: Type.Literal("header"), id: name, title: ViewHeaderTitleSchema, subtitle: Type.Optional(text),
  media: Type.Optional(FeaturedMediaSchema),
});
/** Data shapes and authority belong to the bound canonical journey, never the View. */
export const ViewBoundContentSchema = immutable(Type.Union([
  closed({ kind: Type.Literal("collection"), id: name, input: name, output: name,
    fields: Type.Optional(Type.Array(FactReferenceSchema, { minItems: 1, uniqueItems: true })),
    presentation: Type.Optional(Type.Union([
      closed({ kind: Type.Literal("media-grid"), image: FactReferenceSchema,
        fit: Type.Optional(FactReferenceSchema), description: Type.Optional(FactReferenceSchema) }),
      closed({ kind: Type.Literal("collection-grid"), title: FactReferenceSchema }),
      closed({ kind: Type.Literal("summary-widget"), title: text, description: text, totalLabel: text }),
    ])) }),
  closed({ kind: Type.Literal("form"), id: name, input: name }),
  closed({ kind: Type.Literal("context"), id: name, input: name,
    fields: Type.Optional(Type.Array(FactReferenceSchema, { uniqueItems: true })),
    presentation: Type.Optional(closed({ kind: Type.Literal("media-object"), media: FactReferenceSchema,
      description: Type.Optional(FactReferenceSchema) })) }),
]));
export const ViewCatalogContentSchema = closed({ kind: Type.Literal("visual-catalog"), id: name });
export const ViewAppearanceContentSchema = closed({ kind: Type.Literal("appearance"), id: name });
export const ViewSystemContentSchema = closed({ kind: Type.Literal("system-status"), id: name });
export const ViewIdentityContentSchema = closed({ kind: Type.Literal("identity"), id: name });
export const ViewAttentionContentSchema = closed({ kind: Type.Literal("attention"), id: name });
export const ViewMediaContentSchema = closed({
  kind: Type.Literal("media-library"), id: name, library: MediaLibrarySchema,
});
export const ViewDestinationLinkSchema = closed({ kind: Type.Literal("destination-link"), id: name, output: name, label: text, icon: Type.Optional(ActionIconSchema) });
export const ViewItemSchema = immutable(Type.Union([...ViewLeafSchema.anyOf, ...ViewBoundContentSchema.anyOf, ViewDestinationLinkSchema]));
export const ViewStackSchema = closed({
  kind: Type.Literal("stack"), id: name, title: text, description: Type.Optional(text),
  items: Type.Array(ViewItemSchema, { minItems: 1 }),
});
export const ViewContentSchema = immutable(Type.Union([
  ViewHeaderSchema, ViewStackSchema, ViewCatalogContentSchema, ViewMediaContentSchema, ViewAppearanceContentSchema, ViewSystemContentSchema, ViewIdentityContentSchema, ViewAttentionContentSchema,
  closed({ kind: Type.Literal("destination") }), closed({ kind: Type.Literal("navigation") }),
  ...ViewItemSchema.anyOf,
]));
export const ViewToolbarSchema = closed({
  kind: Type.Literal("toolbar"),
  actionGroup: Type.Optional(Type.Literal("create")),
  actions: Type.Array(closed({
    output: name, label: text, icon: ActionIconSchema, disabled: Type.Optional(Type.Boolean()),
  })),
});
export const ViewRefSchema = closed({ kind: Type.Literal("view"), view: name });
export const ViewSchema = closed({
  version: Type.Literal(ViewVersion), id: name,
  layout: Type.Optional(Type.Union([Type.Literal("overview"), Type.Literal("gallery")])),
  outputs: Type.Optional(Type.Array(name)),
  topDock: Type.Optional(ViewToolbarSchema), bottomDock: Type.Optional(ViewToolbarSchema),
  leftDock: Type.Optional(ViewRefSchema), rightDock: Type.Optional(ViewRefSchema),
  content: Type.Array(ViewContentSchema),
});

/** What a product declares (plan §14): the same view with a message in each message field (src/views/declared.ts). */
export const DeclaredViewSchema = declaredSchema(ViewSchema);

export type View = Frozen<Static<typeof ViewSchema>>;
export type DeclaredView = Declared<View>;
export type DeclaredViewContent = Declared<ViewContent>;
export type DeclaredViewToolbar = Declared<ViewToolbar>;
export type DeclaredViewStack = Declared<ViewStack>;
export type DeclaredViewItem = Declared<ViewItem>;
export type DeclaredViewBoundContent = Declared<ViewBoundContent>;
export type ViewLeaf = Frozen<Static<typeof ViewLeafSchema>>;
export type ViewHeader = Frozen<Static<typeof ViewHeaderSchema>>;
export type ViewHeaderTitle = Frozen<Static<typeof ViewHeaderTitleSchema>>;
export type ViewStack = Frozen<Static<typeof ViewStackSchema>>;
export type ViewContent = Frozen<Static<typeof ViewContentSchema>>;
export type ViewToolbar = Frozen<Static<typeof ViewToolbarSchema>>;
export type ViewRef = Frozen<Static<typeof ViewRefSchema>>;
export type ViewItem = Frozen<Static<typeof ViewItemSchema>>;
export type ViewBoundContent = Frozen<Static<typeof ViewBoundContentSchema>>;
export type ViewMediaContent = Frozen<Static<typeof ViewMediaContentSchema>>;
```

## src/views/ports.ts

Source SHA-256: be4f93f3eb5a7e8b9f1c3540b2814ddc54198ad5740395e54366138ac55624a8

```ts
import type { View, ViewBoundContent, ViewContent } from "./schema.ts";

/** Derived data ports; no duplicate input schema or editable field list is authored. */
export function viewInputs(definition: View): readonly ViewBoundContent[] {
  return Object.freeze(definition.content.flatMap<ViewContent>(item => item.kind === "stack" ? item.items : [item])
    .filter((item): item is ViewBoundContent =>
      item.kind === "collection" || item.kind === "form" || item.kind === "context"));
}
```

## src/views/program-schema.ts

Source SHA-256: a7ca597c6071e74e811a99c43165fc406933869113bcb9d54d6b55e27ea42237

```ts
import { Type, type Static } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import { ActionIconSchema } from "../interaction/toolbar.ts";
import { ViewSchema, ViewLimits } from "./schema.ts";
import { closed, immutable, name, text } from "./definition.ts";
import { ObjectPresentationSchema, FactReferenceSchema } from "./object-presentation.ts";
import { ActivityPlanSchema } from "../activities/schema.ts";

export const ViewProgramVersion = "desert.view-program/4" as const;
export const ViewOutputActionSchema = immutable(Type.Union([
  closed({ kind: Type.Literal("journey"), journey: name }),
  closed({ kind: Type.Literal("select") }),
  closed({ kind: Type.Literal("submit") }),
  closed({ kind: Type.Literal("close") }),
  closed({ kind: Type.Literal("back") }),
  closed({ kind: Type.Literal("lock") }),
]));
export const ViewOutputBindingSchema = closed({ view: name, output: name, action: ViewOutputActionSchema });
const outputs = Type.Array(ViewOutputBindingSchema, { maxItems: ViewLimits.catalogSize });
export const ViewJourneyVariants = Object.freeze({
  presentation: closed({ id: name, kind: Type.Literal("presentation"), view: name,
    collections: Type.Optional(Type.Array(closed({ input: name, read: name, limit: Type.Integer({ minimum: 1, maximum: 200 }),
      summary: Type.Optional(closed({ field: FactReferenceSchema,
        segments: Type.Array(closed({ value:text,label:text }), {minItems:2,maxItems:6}) })),
      preview: Type.Optional(closed({ read: name, where: FactReferenceSchema, media: FactReferenceSchema,
        cover: Type.Optional(FactReferenceSchema) })),
      where: Type.Optional(closed({ field: name, value: text })) }), { maxItems: 8 })), outputs }),
  read: closed({ id: name, kind: Type.Literal("read"), view: name, detailView: name,
    presentation: Type.Optional(Type.Literal("main")),
    referenceCreation: Type.Optional(Type.Literal("separate")),
    related: Type.Optional(Type.Array(closed({ input: name, read: name,
      layout: Type.Optional(FactReferenceSchema),
      membership: Type.Optional(closed({ update: name, input: name })),
      where: closed({ field: FactReferenceSchema, includes: Type.Literal("subject") }) }), { maxItems: 8 })), outputs }),
  create: closed({ id: name, kind: Type.Literal("create"), source: name, view: name, preferredDock: Type.Literal("right"),
    initializeFrom: Type.Optional(closed({ input: name, source: name })),
    presentation: Type.Optional(Type.Literal("transient")),
    startWith: Type.Optional(closed({ kind: Type.Literal("file-picker"), input: name })), outputs }),
  update: closed({ id: name, kind: Type.Literal("update"), source: name, view: name, preferredDock: Type.Literal("right"),
    presentation: Type.Optional(Type.Literal("transient")),
    initialize: Type.Array(closed({ input: name, fact: name }), { maxItems: ViewLimits.catalogSize }), outputs }),
  action: closed({ id: name, kind: Type.Literal("action"), source: name, outputs: Type.Tuple([]) }),
  activity: closed({ id: name, kind: Type.Literal("activity"), source: name, activity: ActivityPlanSchema,
    preferredDock: Type.Literal("right"), outputs: Type.Tuple([]) }),
});
export const ViewJourneySchema = immutable(Type.Union([
  ViewJourneyVariants.presentation, ViewJourneyVariants.read, ViewJourneyVariants.create,
  ViewJourneyVariants.update, ViewJourneyVariants.action, ViewJourneyVariants.activity,
]));
export const ViewDestinationSchema = closed({ id: name, label: text, icon: ActionIconSchema, entryJourney: name });
/** Product navigation owns selection, order and semantic grouping; icons are not routing rules. */
export const ViewNavigationEntrySchema = immutable(closed({
  destination: name, group: text, purpose: Type.Union([Type.Literal("content"), Type.Literal("utility")]),
}));
export const ViewProgramSchema = closed({
  version: Type.Literal(ViewProgramVersion), productId: name, label: text, workspace: name,
  objects: Type.Optional(Type.Array(ObjectPresentationSchema, { maxItems: ViewLimits.catalogSize })),
  views: Type.Array(ViewSchema, { minItems: 1, maxItems: ViewLimits.catalogSize }),
  journeys: Type.Array(ViewJourneySchema, { minItems: 1, maxItems: ViewLimits.catalogSize }),
  destinations: Type.Array(ViewDestinationSchema, { minItems: 1, maxItems: ViewLimits.catalogSize }),
  entry: name, navigation: Type.Array(ViewNavigationEntrySchema, { minItems: 1, maxItems: ViewLimits.catalogSize }),
});
export type ViewProgram = Frozen<Static<typeof ViewProgramSchema>>;
export type ViewJourney = Frozen<Static<typeof ViewJourneySchema>>;
export type ViewDestination = Frozen<Static<typeof ViewDestinationSchema>>;
export type ViewNavigationEntry = Frozen<Static<typeof ViewNavigationEntrySchema>>;
export type ViewOutputBinding = Frozen<Static<typeof ViewOutputBindingSchema>>;
export type ViewOutputAction = Frozen<Static<typeof ViewOutputActionSchema>>;
```

## src/views/program.ts

Source SHA-256: 2ace18ae7230bf027468e80728f5c6d9a7e950530a4d5918d67098a6dc6b996a

```ts
import { Check } from "@sinclair/typebox/value";
import { ConnectionPolicySchema } from "../connection-policy.ts";
import { requireProgramOwnedNavigation } from "../navigation-ownership.ts";
import { freezeDeep } from "../json.ts";
import type { Surface } from "../web/types.ts";
import { ViewProgramSchema, type ViewProgram } from "./program-schema.ts";
import { viewSnapshot } from "./snapshot.ts";
import { viewIndex } from "./view-index.ts";
import { journeyViews, validateJourneyExposure, validateJourneyViews } from "./program-views.ts";
import { validateJourneyOutputs } from "./program-outputs.ts";
import { validateProgramBindings } from "./program-bindings.ts";
import { validateProgramHeaders } from "./program-headers.ts";
import { viewHeaderImages } from "./header-media.ts";
import { InteractionProtocolVersion } from "../interaction/protocol.ts";
import { requireFieldPresentation } from "../field-representation.ts";
import { validateProgramWorkspace } from "./program-workspace.ts";

/** Bind presentation to an already compiled human exposure; this grants no execution authority. */
export function compileViewProgram(definition: unknown, surface: Surface): ViewProgram {
  requireProgramOwnedNavigation(surface);
  const input = viewSnapshot(definition);
  if (!Check(ViewProgramSchema, input)) throw new Error("INVALID_VIEW_PROGRAM");
  if (surface.kind !== "human" || surface.protocol !== InteractionProtocolVersion ||
    !surface.language || !surface.commit || !surface.connection ||
    !Check(ConnectionPolicySchema, surface.connection)) throw new Error("INVALID_VIEW_PROGRAM_SURFACE");
  const fieldPresentation = requireFieldPresentation(surface.fieldRepresentations, surface.fieldKinds, Object.keys(surface.language.fields));
  const human = { ...surface, language: surface.language,
    commit: surface.commit, connection: surface.connection, ...fieldPresentation };
  if (input.productId !== surface.productId) throw new Error("VIEW_PROGRAM_PRODUCT_MISMATCH");
  const views = new Map(viewIndex(input.views).map(item => [item.id, item]));
  const journeys = new Map(input.journeys.map(item => [item.id, item]));
  if (journeys.size !== input.journeys.length) throw new Error("DUPLICATE_VIEW_JOURNEY");
  const destinations = new Map(input.destinations.map(item => [item.id, item]));
  if (destinations.size !== input.destinations.length) throw new Error("DUPLICATE_VIEW_DESTINATION");
  const usedViews = new Set(validateProgramWorkspace(input));
  for (const value of views.values()) {
    for (const item of value.content) if (item.kind === "header" && item.media) viewHeaderImages(item.media);
    if (value.content.findIndex(item => item.kind === "header") > 0) throw new Error("INVALID_PROGRAM_HEADER_PLACEMENT");
  }
  // Exposure is checked before output references so forged canonical identities fail at their owner.
  for (const journey of journeys.values()) validateJourneyExposure(journey, human);
  validateProgramBindings(input, human);
  validateProgramHeaders(input);
  for (const journey of journeys.values()) {
    const owned = journeyViews(journey, views);
    owned.forEach(item => usedViews.add(item.id));
    validateJourneyViews(journey, owned);
    validateJourneyOutputs(journey, owned, journeys);
  }
  if (usedViews.size !== views.size) throw new Error("UNUSED_PROGRAM_VIEW");
  for (const destination of destinations.values()) {
    const journey = journeys.get(destination.entryJourney);
    if (!journey) throw new Error("UNKNOWN_DESTINATION_JOURNEY");
    if (journey.kind !== "presentation" && journey.kind !== "read") throw new Error("INVALID_DESTINATION_JOURNEY");
  }
  for (const journey of journeys.values()) {
    if (journey.kind !== "presentation" && journey.kind !== "read") continue;
    const entries = input.destinations.filter(item => item.entryJourney === journey.id);
    const companionRead = Object.values(human.fieldReferences ?? {}).some(reference => reference.read === journey.id);
    const boundRead = journey.kind === "read" && journey.presentation !== "main" && (companionRead || input.journeys.some(owner =>
      owner.kind === "presentation" ? owner.collections?.some(binding => binding.read === journey.id)
        : owner.kind === "read" && owner.related?.some(binding => binding.read === journey.id)));
    if (entries.length !== 1 && !(entries.length === 0 && boundRead)) throw new Error("INVALID_JOURNEY_DESTINATION_COUNT");
  }
  if (!destinations.has(input.entry)) throw new Error("UNKNOWN_ENTRY_DESTINATION");
  const navigation = input.navigation.map(item => item.destination);
  if (new Set(navigation).size !== navigation.length) throw new Error("DUPLICATE_NAVIGATION_DESTINATION");
  if (navigation.some(id => !destinations.has(id))) throw new Error("UNKNOWN_NAVIGATION_DESTINATION");
  const reachable = new Set([input.entry, ...navigation].map(id => destinations.get(id)!.entryJourney));
  for (const object of input.objects ?? []) for (const action of object.actions) reachable.add(action.journey);
  for (const reference of Object.values(human.fieldReferences ?? {})) {
    if (journeys.has(reference.read)) reachable.add(reference.read);
  }
  // Attention is a resume route for existing occurrences, never a second creation entry.
  if (input.views.some(view => view.content.some(item => item.kind === "attention"))) {
    for (const journey of input.journeys) if (journey.kind === "activity") reachable.add(journey.id);
  }
  const pending = [...reachable];
  while (pending.length) {
    const current = journeys.get(pending.pop()!)!;
    if (current.kind === "presentation") for (const binding of current.collections ?? []) {
      if (!reachable.has(binding.read)) { reachable.add(binding.read); pending.push(binding.read); }
    }
    if (current.kind === "read") for (const binding of current.related ?? []) {
      if (!reachable.has(binding.read)) { reachable.add(binding.read); pending.push(binding.read); }
    }
    for (const output of current.outputs) {
      if (output.action.kind !== "journey" || reachable.has(output.action.journey)) continue;
      reachable.add(output.action.journey);
      pending.push(output.action.journey);
    }
  }
  if (reachable.size !== journeys.size) throw new Error("UNREACHABLE_PROGRAM_JOURNEY");
  return freezeDeep(input);
}
```

## src/views/program-views.ts

Source SHA-256: 18c5c5dc6e4765309f90c6a643cb92d43b49f21f929ca0cd05479502b427f73e

```ts
import type { HumanSurface } from "../web/types.ts";
import type { View } from "./schema.ts";
import type { ViewJourney } from "./program-schema.ts";
import { viewInputs } from "./ports.ts";
import { requireActivityBindings, requireActivityViews } from "../activities/views.ts";

export function journeyViews(journey: ViewJourney, views: ReadonlyMap<string, View>): readonly View[] {
  if (journey.kind === "action") return [];
  const ids = journey.kind === "activity" ? [...new Set([...journey.activity.steps.map(step => step.view), journey.activity.review])]
    : journey.kind === "read" ? [journey.view, journey.detailView] : [journey.view];
  if (new Set(ids).size !== ids.length) throw new Error("DUPLICATE_JOURNEY_VIEW");
  return ids.map(id => {
    const definition = views.get(id);
    if (!definition) throw new Error("UNKNOWN_PROGRAM_VIEW");
    return definition;
  });
}

/** Presentation exposure does not infer navigation from a legacy default entry. */
export function validateJourneyExposure(journey: ViewJourney, surface: HumanSurface) {
  const canonical = surface.journeys.find(item => item.id === journey.id);
  if (journey.kind === "presentation") {
    if (canonical) throw new Error("PRESENTATION_JOURNEY_COLLISION");
    return;
  }
  if (!canonical) throw new Error("UNEXPOSED_VIEW_JOURNEY");
  if (journey.kind === "read") {
    if (canonical.kind !== "read") throw new Error("VIEW_JOURNEY_KIND_MISMATCH");
  } else {
    if (canonical.kind !== "mutation" || Boolean(canonical.subject) !== (journey.kind !== "create" && journey.kind !== "activity")) {
      throw new Error("VIEW_JOURNEY_KIND_MISMATCH");
    }
    if (journey.kind === "action" && canonical.inputFields.length) throw new Error("INVALID_VIEW_ACTION_INPUTS");
    if (journey.kind === "create" && journey.startWith &&
      (!canonical.inputFields.includes(journey.startWith.input) ||
        surface.fieldKinds?.[`${canonical.object}.${journey.startWith.input}`] !== "asset")) {
      throw new Error("INVALID_FILE_ENTRY_INPUT");
    }
    if (journey.kind === "create" && journey.startWith && journey.presentation !== "transient") {
      throw new Error("FILE_ENTRY_REQUIRES_TRANSIENT");
    }
    if (journey.kind === "activity" && journey.id !== journey.activity.journey) throw new Error("ACTIVITY_JOURNEY_MISMATCH");
    if (journey.kind === "activity" && surface.commit[journey.id] !== "review") throw new Error("ACTIVITY_REVIEW_REQUIRED");
  }
}

export function validateJourneyViews(journey: ViewJourney, owned: readonly View[]) {
  if (journey.kind === "action") return;
  if (journey.kind === "activity") {
    requireActivityViews(owned); requireActivityBindings(owned, journey.activity); return;
  }
  const main = owned[0]!;
  const expected = journey.kind === "presentation" ? (journey.collections ?? []).map(() => "collection") : [journey.kind === "read" ? "collection" : "form"];
  function inputs(definition: View, kinds: readonly string[]) {
    const ports = viewInputs(definition);
    if (ports.length !== kinds.length || ports.some((port, index) => port.kind !== kinds[index])) {
      throw new Error("INVALID_JOURNEY_VIEW_INPUTS");
    }
  }
  inputs(main, expected);
  if (journey.kind === "read") inputs(owned[1]!, ["context", ...(journey.related ?? []).map(() => "collection")]);
  for (const definition of owned) {
    if (definition.content.some(item => item.kind === "attention") && journey.kind !== "presentation") {
      throw new Error("INVALID_ATTENTION_CONTENT");
    }
    const media = definition.content.filter(item => item.kind === "media-library");
    if (media.length && definition.content.some(item => item.kind === "header" && item.media)) {
      throw new Error("CONFLICTING_VIEW_HEADER_MEDIA");
    }
    if (media.length && (journey.kind !== "presentation" || definition.content.length !== 2 ||
      definition.content[0]?.kind !== "header" || definition.content[1]?.kind !== "media-library")) {
      throw new Error("INVALID_JOURNEY_MEDIA_CONTENT");
    }
    const catalogs = definition.content.filter(item => item.kind === "visual-catalog");
    if (catalogs.length > 1 || (catalogs.length && journey.kind !== "presentation")) {
      throw new Error("INVALID_JOURNEY_CATALOG_CONTENT");
    }
    const appearance = definition.content.filter(item => item.kind === "appearance");
    if (appearance.length && (journey.kind !== "presentation" || definition.content.length !== 2 ||
      definition.content[0]?.kind !== "header" || definition.content[1]?.kind !== "appearance")) {
      throw new Error("INVALID_JOURNEY_APPEARANCE_CONTENT");
    }
    const system = definition.content.filter(item => item.kind === "system-status");
    if (system.length && (journey.kind !== "presentation" || definition.content.length !== 2 ||
      definition.content[0]?.kind !== "header" || definition.content[1]?.kind !== "system-status")) {
      throw new Error("INVALID_JOURNEY_SYSTEM_CONTENT");
    }
    const identity = definition.content.filter(item => item.kind === "identity");
    if (identity.length && (journey.kind !== "presentation" || definition.content.length !== 2 ||
      definition.content[0]?.kind !== "header" || definition.content[1]?.kind !== "identity")) {
      throw new Error("INVALID_JOURNEY_IDENTITY_CONTENT");
    }
  }
}
```

## src/views/program-outputs.ts

Source SHA-256: 703c79b137e55f1679c40b187a1173b0c22ef71883bf8d5d7e9f65a3f4f9fa24

```ts
import type { View, ViewContent } from "./schema.ts";
import type { ViewJourney } from "./program-schema.ts";
import { viewInputs } from "./ports.ts";

export function validateJourneyOutputs(journey: ViewJourney, owned: readonly View[], journeys: ReadonlyMap<string, ViewJourney>) {
  const seen = new Set<string>();
  for (const binding of journey.outputs) {
    const definition = owned.find(item => item.id === binding.view);
    if (!definition) throw new Error("FOREIGN_OUTPUT_VIEW");
    if (!definition.outputs?.includes(binding.output)) throw new Error("UNKNOWN_BOUND_VIEW_OUTPUT");
    const key = `${binding.view}/${binding.output}`;
    if (seen.has(key)) throw new Error("DUPLICATE_VIEW_OUTPUT_BINDING");
    seen.add(key);
    const collection = viewInputs(definition).find(port => port.kind === "collection" && port.output === binding.output);
    const widget=collection?.kind==='collection'&&collection.presentation?.kind==='summary-widget';
    const link = definition.content.flatMap<ViewContent>(item => item.kind === "stack" ? item.items : [item])
      .find(item => item.kind === "destination-link" && item.output === binding.output);
    if (link && binding.action.kind !== "journey") throw new Error("INVALID_DESTINATION_LINK_ACTION");
    if (collection && binding.action.kind !== (widget?'journey':'select')) throw new Error("INVALID_COLLECTION_OUTPUT_ACTION");
    switch (binding.action.kind) {
      case "lock":
        if (journey.kind !== "presentation" || !definition.content.some(item => item.kind === "identity") ||
          !definition.topDock?.actions.some(action => action.output === binding.output)) throw new Error("INVALID_IDENTITY_LOCK");
        break;
      case "journey": {
        const target = journeys.get(binding.action.journey);
        if (!target) throw new Error("UNKNOWN_OUTPUT_JOURNEY");
        const browsing = target.kind === "read" || target.kind === "presentation";
        if (link && !browsing) throw new Error("INVALID_DESTINATION_LINK_ACTION");
        if (widget && !browsing) throw new Error("INVALID_WIDGET_ACTION");
        if (browsing && [definition.topDock, definition.bottomDock].some(toolbar =>
          toolbar?.actions.some(action => action.output === binding.output))) throw new Error("FORWARD_NAVIGATION_IN_TOOLBAR");
        if ((target.kind === "update" || target.kind === "action") &&
          (journey.kind !== "read" || binding.view !== journey.detailView || target.source !== journey.id)) {
          throw new Error("INVALID_VIEW_SUBJECT_EDGE");
        }
        break;
      }
      case "select":
        if (!collection || journey.kind !== "read" && !(journey.kind === "presentation" &&
          journey.collections?.some(binding => binding.input === collection.input))) throw new Error("INVALID_VIEW_OUTPUT_ACTION");
        break;
      case "back":
        if ((journey.kind !== "read" && journey.kind !== "presentation") ||
          (definition.id !== journey.view && !(journey.kind === "read" && journey.presentation === "main" && definition.id === journey.detailView)) ||
          !definition.topDock?.actions.some(action => action.output === binding.output && action.icon === "back")) {
          throw new Error("INVALID_BACK_OUTPUT");
        }
        break;
      case "submit":
        if (journey.kind !== "create" && journey.kind !== "update") throw new Error("INVALID_VIEW_OUTPUT_ACTION");
        break;
      case "close":
        if (journey.kind !== "create" && journey.kind !== "update" && !(journey.kind === "read" && binding.view === journey.detailView)) {
          throw new Error("INVALID_VIEW_OUTPUT_ACTION");
        }
        // Only runtime busy/uncertain state may lock dismissal across button, Escape and scrim.
        if ([definition.topDock, definition.bottomDock].some(toolbar => toolbar?.actions.some(action =>
          action.output === binding.output && action.disabled === true))) throw new Error("AUTHORED_CLOSE_DISABLED");
    }
  }
  for (const definition of owned) {
    if (definition.outputs?.some(output => !seen.has(`${definition.id}/${output}`))) throw new Error("UNBOUND_VIEW_OUTPUT");
  }
  if ((journey.kind === "create" || journey.kind === "update") && (journey.outputs.filter(binding => binding.action.kind === "submit").length !== 1 ||
    journey.outputs.filter(binding => binding.action.kind === "close").length !== 1)) {
    throw new Error("INVALID_CREATE_OUTPUTS");
  }
  if (journey.kind === "read" && journey.outputs.filter(binding => binding.view === journey.detailView &&
    binding.action.kind === (journey.presentation === "main" ? "back" : "close")).length !== 1) {
    throw new Error("INVALID_DETAIL_OUTPUTS");
  }
  for (const definition of owned) {
    const top = definition.topDock?.actions ?? [];
    const bottom = definition.bottomDock?.actions ?? [];
    const bindingFor = (output: string) => journey.outputs.find(item => item.view === definition.id && item.output === output);
    if (bottom.length > 1 || bottom.some(item => bindingFor(item.output)?.action.kind === "close")) {
      throw new Error("UNSUPPORTED_PROGRAM_BOTTOM_TOOLBAR");
    }
    const panel = journey.kind === "create" || journey.kind === "update" || (journey.kind === "read" && journey.presentation !== "main" && definition.id === journey.detailView);
    if (panel && (bindingFor(top[0]?.output ?? "")?.action.kind !== "close" ||
      top.slice(1).some(item => bindingFor(item.output)?.action.kind === "close"))) {
      throw new Error("INVALID_PANEL_CLOSE_ACTION");
    }
    if ((journey.kind === "create" || journey.kind === "update") && bindingFor(bottom[0]?.output ?? "")?.action.kind !== "submit") {
      throw new Error("INVALID_CREATE_SUBMIT_PLACEMENT");
    }
    if (journey.kind === "read" && journey.presentation !== "main" && definition.id === journey.detailView && (top.length !== 1 || bottom.length !== 0)) {
      throw new Error("UNSUPPORTED_CONTEXT_TOOLBAR");
    }
    if (new Set([...top, ...bottom].map(item => item.output)).size !== top.length + bottom.length) {
      throw new Error("DUPLICATE_TOOLBAR_OUTPUT");
    }
    const collectionOutputs = viewInputs(definition).flatMap(port => port.kind === "collection" ? [port.output] : []);
    if ([...top, ...bottom].some(item => collectionOutputs.includes(item.output))) {
      throw new Error("CONFLICTING_VIEW_OUTPUT_PORT");
    }
    const emitted = new Set([
      ...[...top, ...bottom].map(action => action.output), ...collectionOutputs,
      ...definition.content.flatMap<ViewContent>(item => item.kind === "stack" ? item.items : [item])
        .flatMap(item => item.kind === "destination-link" ? [item.output] : []),
    ]);
    for (const output of definition.outputs ?? []) {
      if (!emitted.has(output)) throw new Error("UNREACHABLE_VIEW_OUTPUT");
    }
  }
}
```

## src/modules/schema.ts

Source SHA-256: c87c4729a6b2d02598c2569a5b534474f91cf3de0cb161c565b1580965c16a89

```ts
import { Type } from "@sinclair/typebox";
import { ProductDefinitionSchema } from "../contracts.ts";
import { JourneySchema } from "../program-grammar.ts";
import { ViewSchema } from "../views/schema.ts";
import { ViewJourneyVariants, ViewDestinationSchema, ViewNavigationEntrySchema, ViewOutputActionSchema } from "../views/program-schema.ts";
import { closed, name, text } from "../views/definition.ts";
import { AuthoredPublishedPresentationSchema, HumanReviewSchema } from "./human-presentation.ts";
import { AuthoredExposureSchema } from "../human-exposure.ts";
import { declaredSchema } from "../views/declared.ts";

const reference = <K extends "view" | "journey" | "destination">(kind: K) => Type.Union([
  name, closed({ kind: Type.Literal(kind), owner: name, id: name }),
]);
const output = closed({ view: reference("view"), output: name, action: Type.Union([
  closed({ kind: Type.Literal("journey"), journey: reference("journey") }),
  ...ViewOutputActionSchema.anyOf.filter(action => action.properties.kind.const !== "journey"),
]) });
const sharedJourney = { view: reference("view"), outputs: Type.Array(output) };
export const AuthoredViewJourneySchema = Type.Union([
  closed({ ...ViewJourneyVariants.presentation.properties, ...sharedJourney }),
  closed({ ...ViewJourneyVariants.read.properties, ...sharedJourney, detailView: reference("view") }),
  closed({ ...ViewJourneyVariants.create.properties, ...sharedJourney, source: reference("journey") }),
  closed({ ...ViewJourneyVariants.update.properties, ...sharedJourney, source: reference("journey") }),
  closed({ ...ViewJourneyVariants.action.properties, source: reference("journey") }),
  closed({ ...ViewJourneyVariants.activity.properties, source: reference("journey") }),
]);
export const ModuleJourneySchema = Type.Union([
  closed({ execution: JourneySchema.anyOf[0], presentation: Type.Optional(AuthoredViewJourneySchema),
    label: Type.Optional(text), humanReview: Type.Optional(HumanReviewSchema) }),
  closed({ execution: JourneySchema.anyOf[1], presentation: Type.Optional(AuthoredViewJourneySchema),
    label: Type.Optional(text), humanReview: Type.Optional(Type.Never()) }),
  closed({ execution: Type.Optional(Type.Never()), presentation: AuthoredViewJourneySchema,
    label: Type.Optional(Type.Never()), humanReview: Type.Optional(Type.Never()) }),
]);
export const AuthoredViewDestinationSchema = closed({ ...ViewDestinationSchema.properties, entryJourney: reference("journey") });
export const AuthoredViewNavigationEntrySchema = closed({ ...ViewNavigationEntrySchema.properties, destination: reference("destination") });
const domain = ProductDefinitionSchema.properties;
export const PublishedObjectSchema = closed({ ...domain.objects.items.properties,
  presentation: Type.Optional(AuthoredPublishedPresentationSchema) });
export const OwnedProperties = {
  objects: Type.Optional(Type.Array(PublishedObjectSchema)),
  dependencies: domain.dependencies, policies: domain.policies,
  journeys: Type.Optional(Type.Array(ModuleJourneySchema)),
  views: Type.Optional(Type.Array(ViewSchema)), destinations: Type.Optional(Type.Array(AuthoredViewDestinationSchema)),
};
export const OwnedDefinitionsSchema = closed(OwnedProperties);
const names = Type.Optional(Type.Array(name, { uniqueItems: true }));
export const ModuleExportsSchema = closed({
  objects: names, dependencies: names, journeys: names, views: names, destinations: names,
});
export const ModuleDefinitionSchema = closed({ id: name, ...OwnedProperties, exports: Type.Optional(ModuleExportsSchema) });
/** What a module and a product declare (plan §14): the same shapes with a message in each message field. The product's
 * catalog resolves them into the compiled shapes above when the product is composed. */
export const DeclaredModuleDefinitionSchema = declaredSchema(ModuleDefinitionSchema);
export const ProductCompositionSchema = closed({
  id: name, label: text, workspace: reference("view"), ...OwnedProperties,
  modules: Type.Array(ModuleDefinitionSchema), exposures: Type.Array(AuthoredExposureSchema, { minItems: 1 }),
  entry: reference("destination"), navigation: Type.Array(AuthoredViewNavigationEntrySchema, { minItems: 1 }),
});
export const DeclaredProductCompositionSchema = declaredSchema(ProductCompositionSchema);
```

## src/modules/ownership.ts

Source SHA-256: f82319d2c666a9c1cc133751d965909a1196465bb3b768f4fa903f0234975ef4

```ts
import type { ModuleEntryKind, OwnedDefinitions, ResolvedModuleDefinition } from "./types.ts";
type ModuleReferenceKind = "view" | "journey" | "destination";
type ResolvedReference<K extends ModuleReferenceKind> = string | Readonly<{ kind: K; owner: string; id: string }>;

export const entryKinds = ["objects", "dependencies", "journeys", "views", "destinations"] as const;
export const productOwner = "@product";
export const journeyId = (journey: NonNullable<OwnedDefinitions["journeys"]>[number]) => journey.presentation?.id ?? journey.execution!.id;
export function entryIds(owner: OwnedDefinitions, kind: ModuleEntryKind): readonly string[] {
  return kind === "journeys" ? (owner.journeys ?? []).map(journeyId) : (owner[kind] ?? []).map(item => item.id);
}
export function validateOwnedDomain(owner: OwnedDefinitions) {
  const objects = new Set(entryIds(owner, "objects"));
  const dependencies = new Set(entryIds(owner, "dependencies"));
  const requireObject = (id: string) => { if (!objects.has(id)) throw new Error("FOREIGN_MODULE_OBJECT"); };
  const requireDependency = (id: string) => { if (!dependencies.has(id)) throw new Error("FOREIGN_MODULE_DEPENDENCY"); };
  for (const policy of owner.policies ?? []) requireObject(policy.object);
  for (const dependency of owner.dependencies ?? []) {
    if (dependency.kind === "controller") dependency.objects.forEach(requireObject);
    dependency.requires.forEach(requireDependency);
  }
  for (const registration of owner.journeys ?? []) {
    const { execution, presentation } = registration;
    if (!execution) {
      if (presentation?.kind !== "presentation") throw new Error("MISSING_MODULE_EXECUTION");
      continue;
    }
    if (presentation && (execution.id !== presentation.id || presentation.kind === "presentation" ||
      (presentation.kind === "read" ? execution.kind !== "read" :
        execution.kind !== "mutation" || execution.command.kind !== (presentation.kind === "update" || presentation.kind === "action" ? "update" : "create")))) {
      throw new Error("MODULE_JOURNEY_KIND_MISMATCH");
    }
    requireObject(execution.kind === "read" ? execution.object : execution.command.object);
    requireDependency(execution.requires.controller);
    execution.requires.dependencies.forEach(requireDependency);
  }
}

export type Owner = { id: string; definition: OwnedDefinitions; exports?: ResolvedModuleDefinition["exports"] };
export function ownershipRegistry(owners: readonly Owner[]) {
  const registry = new Map<ModuleEntryKind, Map<string, Owner>>();
  for (const kind of entryKinds) {
    const entries = new Map<string, Owner>();
    for (const owner of owners) for (const id of entryIds(owner.definition, kind)) {
      if (entries.has(id)) throw new Error(`DUPLICATE_MODULE_${kind.toUpperCase()}`);
      entries.set(id, owner);
    }
    registry.set(kind, entries);
  }
  function owned<K extends ModuleReferenceKind>(reference: ResolvedReference<K>, kind: K, caller: string, presentation: boolean): string {
    const key = `${kind}s` as ModuleEntryKind;
    const id = typeof reference === "string" ? reference : reference.id;
    const target = registry.get(key)!.get(id);
    if (!target) throw new Error(`UNKNOWN_MODULE_${kind.toUpperCase()}`);
    if (typeof reference === "string") {
      if (target.id !== caller && (caller !== productOwner || !target.exports?.[key]?.includes(id))) throw new Error("PRIVATE_MODULE_REFERENCE");
    } else {
      if (reference.kind !== kind || reference.owner !== target.id) throw new Error("INVALID_MODULE_REFERENCE");
      if (caller !== productOwner) throw new Error("CROSS_MODULE_REFERENCE");
      if (!target.exports?.[key]?.includes(id)) throw new Error("PRIVATE_MODULE_REFERENCE");
    }
    if (presentation && kind === "journey" && !target.definition.journeys?.find(item => journeyId(item) === id)?.presentation) {
      throw new Error("UNPRESENTED_MODULE_JOURNEY");
    }
    return id;
  }
  const resolve=<K extends ModuleReferenceKind>(reference:ResolvedReference<K>,kind:K,caller:string)=>owned(reference,kind,caller,true);
  const resolveExecution=(reference:ResolvedReference<'journey'>,caller:string)=>owned(reference,'journey',caller,false);
  return { registry, resolve, resolveExecution };
}
```

## src/modules/presentation.ts

Source SHA-256: 15bf70773a649ff34767e6e9584b4138d907607a4949967bb4c00806722f4143

```ts
import { Check } from "@sinclair/typebox/value";
import { ViewJourneySchema, ViewDestinationSchema, type ViewJourney, type ViewDestination } from "../views/program-schema.ts";
import { viewIndex } from "../views/view-index.ts";
import type { OwnedDefinitions } from "./types.ts";
import { ownershipRegistry } from "./ownership.ts";

export function resolvePresentation(owner: OwnedDefinitions, caller: string, ownership: ReturnType<typeof ownershipRegistry>) {
  const resolve = ownership.resolve;
  const journeys = (owner.journeys ?? []).flatMap(({ presentation }) => {
    if (!presentation) return [];
    const resolved = {
      ...presentation, ...("view" in presentation ? { view: resolve(presentation.view, "view", caller) } : {}),
      ...(presentation.kind === "read" ? { detailView: resolve(presentation.detailView, "view", caller) } : {}),
      ...(presentation.kind === "read" && presentation.related ? { related: presentation.related.map(binding => ({
        ...binding, read: resolve(binding.read, "journey", caller),
        ...(binding.membership ? { membership: { ...binding.membership, update: ownership.resolveExecution(binding.membership.update, caller) } } : {}) })) } : {}),
      ...("source" in presentation ? { source: resolve(presentation.source, "journey", caller) } : {}),
      ...(presentation.kind === "create" && presentation.initializeFrom ? { initializeFrom: { ...presentation.initializeFrom,
        source: resolve(presentation.initializeFrom.source, "journey", caller) } } : {}),
      ...(presentation.kind === "presentation" && presentation.collections ? { collections: presentation.collections.map(binding => ({
        ...binding, read: resolve(binding.read, "journey", caller),
        ...(binding.preview ? { preview: { ...binding.preview, read: resolve(binding.preview.read, "journey", caller) } } : {}) })) } : {}),
      ...(presentation.kind === "activity" ? { activity: { ...presentation.activity,
        journey: resolve(presentation.activity.journey, "journey", caller),
        review: resolve(presentation.activity.review, "view", caller),
        steps: presentation.activity.steps.map(step => ({ ...step, view: resolve(step.view, "view", caller) })) } } : {}),
      outputs: presentation.outputs.map(output => ({
        ...output, view: resolve(output.view, "view", caller), action: output.action.kind === "journey"
          ? { ...output.action, journey: resolve(output.action.journey, "journey", caller) } : output.action,
      })),
    };
    if (!Check(ViewJourneySchema, resolved)) throw new Error("INVALID_MODULE_JOURNEY");
    return [resolved as ViewJourney];
  });
  const destinations = (owner.destinations ?? []).map(destination => {
    const resolved = { ...destination, entryJourney: resolve(destination.entryJourney, "journey", caller) };
    if (!Check(ViewDestinationSchema, resolved)) throw new Error("INVALID_MODULE_DESTINATION");
    return resolved as ViewDestination;
  });
  for (const view of owner.views ?? []) for (const dock of [view.leftDock, view.rightDock]) {
    if (dock) resolve(dock.view, "view", caller);
  }
  if (owner.views?.length) viewIndex(owner.views);
  return { journeys, destinations };
}
```

## src/modules/product-index.ts

Source SHA-256: e611b20541b672f051d84682d43e711f7ad203bd280960ffee6bf17c9de4f827

```ts
import type { ViewProgram } from "../views/program-schema.ts";
import type { Frozen } from "../json.ts";
import type { ExposureDefinition } from "../program-grammar.ts";
import type { ModuleEntryKind } from "./types.ts";
import { entryKinds, entryIds, journeyId, productOwner, type Owner } from "./ownership.ts";
import { publishedActionsFor } from "../views/program-bindings.ts";

type CatalogEntry = { id: string; owner: string; public: boolean };
/** Inspection data is derived from the same registered definitions, never a parallel inventory. */
export function deriveModuleIndex(owners: readonly Owner[], program: ViewProgram, surfaces: readonly Frozen<ExposureDefinition>[]) {
  const entries = Object.fromEntries(entryKinds.map(kind => [kind, owners.flatMap(owner =>
    entryIds(owner.definition, kind).map(id => ({ id, owner: owner.id,
      public: owner.id === productOwner || owner.exports?.[kind]?.includes(id) === true }))),
  ])) as Record<ModuleEntryKind, CatalogEntry[]>;
  const commands = new Map<string, { id: string; owner: string; journeys: string[] }>();
  for (const owner of owners) for (const registration of owner.definition.journeys ?? []) {
    if (registration.execution?.kind !== "mutation") continue;
    const id = registration.execution.command.id;
    const command = commands.get(id) ?? { id, owner: owner.id, journeys: [] };
    command.journeys.push(journeyId(registration));
    commands.set(id, command);
  }
  const journeys = owners.flatMap(owner => (owner.definition.journeys ?? []).map(registration => {
    const id = journeyId(registration);
    const presentation = program.journeys.find(item => item.id === id);
    return {
      id, owner: owner.id, kind: presentation?.kind ?? "execution-only" as const,
      ...(presentation && "view" in presentation ? { view: presentation.view } : {}),
      ...(presentation?.kind === "activity" ? { activity: presentation.activity } : {}),
      ...(presentation?.kind === "read" ? { detailView: presentation.detailView,
        subjectActions: publishedActionsFor(program, presentation) } : {}),
      ...(presentation && "source" in presentation ? { source: presentation.source } : {}),
      starts: program.destinations.filter(item => item.entryJourney === id).map(item => item.id),
      outputs: presentation?.outputs ?? [],
      exposedOn: surfaces.filter(surface => surface.journeys.includes(id)).map(surface => surface.id),
    };
  }));
  return {
    catalog: { modules: owners.filter(owner => owner.id !== productOwner).map(owner => owner.id), ...entries, commands: [...commands.values()] },
    storyboard: { entry: program.entry, navigation: program.navigation, destinations: program.destinations, journeys },
  };
}
```

## src/modules/human-presentation.ts

Source SHA-256: c4d85ece2fd24d1b95387ee55b481df06a60f0ffbd85fa045cc45e871fddc343

```ts
import { Type, type Static } from "@sinclair/typebox";
import type { ObjectDefinition } from "../contracts.ts";
import type { Frozen } from "../json.ts";
import { closed, text } from "../views/definition.ts";
import { FactReferenceSchema, PublishedPresentationSchema } from "../views/object-presentation.ts";
import { FieldRepresentationSchema, supportsFieldRepresentation } from "../field-representation.ts";

export const PublishedFieldSchema = closed({
  fact: FactReferenceSchema, label: text,
  representation: FieldRepresentationSchema,
});
export const AuthoredPublishedPresentationSchema = closed({
  ...PublishedPresentationSchema.properties, fields: Type.Optional(Type.Array(PublishedFieldSchema)),
});
export const HumanReviewSchema = Type.Union([Type.Literal("required"), Type.Literal("confirmation"), Type.Literal("not-required")]);
export type PublishedField = Frozen<Static<typeof PublishedFieldSchema>>;

export function validatePublishedFields(object: Frozen<ObjectDefinition>, fields: readonly Pick<PublishedField, "fact" | "representation">[]): void {
  const seen = new Set<string>();
  for (const field of fields) {
    if (field.fact.object !== object.id) throw new Error("FOREIGN_PRESENTED_FACT");
    const fact = object.facts[field.fact.field];
    if (!fact) throw new Error("UNKNOWN_PRESENTED_FACT");
    if (seen.has(field.fact.field)) throw new Error("DUPLICATE_PRESENTED_FACT");
    seen.add(field.fact.field);
    if (!supportsFieldRepresentation(fact, field.representation)) {
      throw new Error("INVALID_FACT_REPRESENTATION");
    }
  }
}
```

## src/modules/compile-exposures.ts

Source SHA-256: 7f8b1e1c29fff40f81d203b17600cb845bc1cf4a349a622590b50cc9f5e5f456

```ts
import { Check } from "@sinclair/typebox/value";
import type { Static } from "@sinclair/typebox";
import { RuntimeConnectionPolicy } from "../connection-policy.ts";
import { jsonSnapshot, type Frozen } from "../json.ts";
import { ViewExposureSchema, type JourneyDefinition } from "../program-grammar.ts";
import type { AuthoredHumanExposure, AuthoredExposureSchema } from "../human-exposure.ts";
import { surfaceFields } from "../surface-fields.ts";
import type { OwnedDefinitions } from "./types.ts";
import type { FieldRepresentation } from "../field-representation.ts";

type Exposure = Frozen<Static<typeof AuthoredExposureSchema>>;

function compileHumanExposure(surface: AuthoredHumanExposure, owners: readonly OwnedDefinitions[]) {
  const registrations = new Map(owners.flatMap(owner => (owner.journeys ?? []).flatMap(registration =>
    registration.execution ? [[registration.execution.id, registration] as const] : [])));
  const objects = new Map(owners.flatMap(owner => (owner.objects ?? []).map(object => [object.id, object] as const)));
  const journeys: Frozen<JourneyDefinition>[] = [];
  const journeyLabels: Record<string, string> = Object.create(null);
  const commit: Record<string, "submit" | "review" | "confirm"> = Object.create(null);
  for (const id of surface.journeys) {
    const registration = registrations.get(id);
    if (!registration?.execution) throw new Error("UNKNOWN_SURFACE_JOURNEY");
    if (!registration.label) throw new Error("JOURNEY_LABEL_REQUIRED");
    const journey = registration.execution;
    journeys.push(journey);
    journeyLabels[id] = registration.label;
    if (journey.kind === "mutation") {
      if (!registration.humanReview) throw new Error("HUMAN_REVIEW_REQUIRED");
      commit[id] = registration.humanReview === "required" ? "review" : registration.humanReview === "confirmation" ? "confirm" : "submit";
    }
  }
  const { presented } = surfaceFields(journeys);
  const fields: Record<string, string> = Object.create(null);
  const fieldRepresentations: Record<string, FieldRepresentation> = Object.create(null);
  for (const [key, reference] of presented) {
    const field = objects.get(reference.object)?.presentation?.fields?.find(item => item.fact.field === reference.field);
    if (!field) throw new Error("FIELD_PRESENTATION_REQUIRED");
    fields[key] = field.label;
    fieldRepresentations[key] = field.representation;
  }
  return {
    id: surface.id, kind: "human" as const, journeys: surface.journeys,
    fieldRepresentations, commit,
    language: { locale: surface.locale, fields, journeys: journeyLabels }, connection: RuntimeConnectionPolicy,
  };
}

export function compileExposures(surfaces: readonly Exposure[], owners: readonly OwnedDefinitions[]) {
  return surfaces.map(surface => {
    const compiled = jsonSnapshot(surface.kind === "human" ? compileHumanExposure(surface, owners) : surface);
    if (!Check(ViewExposureSchema, compiled)) throw new Error("INVALID_COMPILED_EXPOSURE");
    return compiled;
  });
}
```

## src/modules/admission.ts

Source SHA-256: 94cfd2da567df0a29c41d21434fd277df3573fb73bb90e21e36f22825c955039

```ts
import { declarationArray, declarationRecord } from "./declaration-data.ts";
import { isModuleOwned, kindOf, moduleKinds, publicReference, requireJourneyUse,
  type LocalEntry, type ModuleRecord, type ReferenceUse } from "./references.ts";
import type { ModuleReferenceKind } from "./reference-types.ts";
import type { ModuleEntryKind } from "./types.ts";
import { requireDefinedView } from "../views/defined-view-registry.ts";

export function referenceAdmission(source: Record<string, unknown>, root: boolean, mounted: readonly ModuleRecord[] = []) {
  const identities = new Map<object, LocalEntry>();
  function register(value: unknown, kind: ModuleReferenceKind, entry?: LocalEntry) {
    const data = declarationRecord(value);
    if (publicReference(value) || isModuleOwned(value as object)) throw new Error("FOREIGN_MODULE_DEFINITION");
    if (kind === "view") requireDefinedView(value);
    const known = identities.get(value as object);
    if (known && known.kind !== kind) throw new Error("MODULE_REFERENCE_KIND_MISMATCH");
    const registered = entry ?? { kind, id: data.id as string, value: value as object };
    identities.set(value as object, registered);
    return registered;
  }
  for (const kind of moduleKinds) for (const value of source[kind] === undefined ? [] : declarationArray(source[kind])) {
    if (kind !== "journeys") { register(value, kindOf(kind)); continue; }
    const registration = declarationRecord(value);
    const execution = registration.execution ? declarationRecord(registration.execution) : undefined;
    const presentation = registration.presentation ? declarationRecord(registration.presentation) : undefined;
    if (!execution && !presentation) throw new Error("MISSING_MODULE_EXECUTION");
    const entry: LocalEntry = { kind: "journey", id: (presentation?.id ?? execution?.id) as string, value: value as object,
      ...(execution ? { execution: registration.execution as object } : {}),
      ...(presentation ? { presentation: registration.presentation as object } : {}) };
    if (execution) {
      register(registration.execution, "journey", entry);
      if (execution.kind === "mutation") register(execution.command, "command");
    }
    if (presentation) register(registration.presentation, "journey", entry);
  }
  function admit(target: unknown, kind: ModuleReferenceKind, use: ReferenceUse = "reference"): LocalEntry {
    if (typeof target === "string") throw new Error("STRING_MODULE_REFERENCE_FORBIDDEN");
    const emitted = publicReference(target, kind);
    if (emitted) {
      if (!root) throw new Error("CROSS_MODULE_REFERENCE");
      if (!mounted.includes(emitted.module)) throw new Error("UNMOUNTED_MODULE_REFERENCE");
      requireJourneyUse(emitted, use);
      return emitted;
    }
    if (typeof target !== "object" || target === null) throw new Error("UNREGISTERED_LOCAL_REFERENCE");
    const entry = identities.get(target);
    if (!entry) {
      if (isModuleOwned(target)) throw new Error(root ? "PRIVATE_MODULE_REFERENCE" : "CROSS_MODULE_REFERENCE");
      throw new Error("UNREGISTERED_LOCAL_REFERENCE");
    }
    if (entry.kind !== kind) throw new Error("MODULE_REFERENCE_KIND_MISMATCH");
    requireJourneyUse(entry, use);
    return entry;
  }
  function aliases() {
    const result = Object.fromEntries(moduleKinds.map(kind => [kind, Object.create(null)])) as
      Record<ModuleEntryKind, Record<string, LocalEntry>>;
    if (source.exports === undefined) return result;
    const exports = declarationRecord(source.exports);
    if (Object.keys(exports).some(kind => !moduleKinds.includes(kind as ModuleEntryKind))) throw new Error("INVALID_MODULE_EXPORTS");
    for (const kind of moduleKinds) {
      if (!Object.hasOwn(exports, kind)) continue;
      const seen = new Set<LocalEntry>();
      for (const [alias, value] of Object.entries(declarationRecord(exports[kind]))) {
        if (!alias || ["__proto__", "constructor", "prototype"].includes(alias)) throw new Error("INVALID_MODULE_EXPORTS");
        const entry = typeof value === "object" && value !== null ? identities.get(value) : undefined;
        if (!entry || entry.kind !== kindOf(kind)) throw new Error("UNKNOWN_MODULE_EXPORT");
        if (seen.has(entry)) throw new Error("DUPLICATE_MODULE_EXPORT_TARGET");
        seen.add(entry); result[kind][alias] = entry;
      }
    }
    return result;
  }
  return { identities, admit, aliases };
}
export type ReferenceAdmission = ReturnType<typeof referenceAdmission>;
```

## src/modules/references.ts

Source SHA-256: ba08a7d382837557d0e6eb3e67539b44f201dea541ed79dd7ae78a3b841759bb

```ts
import { freezeDeep } from "../json.ts";
import type { ModuleReferenceKind } from "./reference-types.ts";
import type { DeclaredModuleDefinition, ModuleEntryKind } from "./types.ts";
import { declarationRecord } from "./declaration-data.ts";

export type LocalEntry = { kind: ModuleReferenceKind; id: string; value: object; execution?: object; presentation?: object };
export type PublicEntry = LocalEntry & { module: ModuleRecord };
export type ModuleRecord = {
  handle: object; definition: DeclaredModuleDefinition;
  exports: Readonly<Record<ModuleEntryKind | "commands", Readonly<Record<string, object>>>>;
};
const modules = new WeakMap<object, ModuleRecord>();
const references = new WeakMap<object, PublicEntry>();
const ownedIdentities = new WeakSet<object>();
export const moduleKinds = ["objects", "dependencies", "journeys", "views", "destinations"] as const;
export const kindOf = (kind: ModuleEntryKind): ModuleReferenceKind => kind === "dependencies" ? "dependency"
  : kind.slice(0, -1) as ModuleReferenceKind;

export function requireModuleHandle(value: unknown): ModuleRecord {
  const found = typeof value === "object" && value !== null ? modules.get(value) : undefined;
  if (!found) throw new Error("UNREGISTERED_MODULE_HANDLE");
  return found;
}
export function publicReference(value: unknown, kind?: ModuleReferenceKind): PublicEntry | undefined {
  if (typeof value !== "object" || value === null) return;
  const found = references.get(value);
  if (!found) {
    if (Object.hasOwn(value, "owner") && Object.hasOwn(value, "kind") && Object.hasOwn(value, "id")) {
      throw new Error("UNREGISTERED_MODULE_REFERENCE");
    }
    return;
  }
  if (kind && found.kind !== kind) throw new Error("MODULE_REFERENCE_KIND_MISMATCH");
  return found;
}
export function isModuleOwned(value: object): boolean { return ownedIdentities.has(value); }

export function issueModule(definition: DeclaredModuleDefinition, identities: ReadonlyMap<object, LocalEntry>,
  aliases: Readonly<Record<ModuleEntryKind, Readonly<Record<string, LocalEntry>>>>): object {
  const handle = Object.freeze({ id: definition.id });
  const exports = Object.fromEntries([...moduleKinds, "commands"].map(kind => [kind, Object.create(null)])) as
    Record<ModuleEntryKind | "commands", Record<string, object>>;
  const record: ModuleRecord = { handle, definition, exports };
  const issued = new Map<LocalEntry, object>();
  function canonical(entry: LocalEntry): LocalEntry {
    if (entry.kind === "journey") {
      const registration = definition.journeys?.find(item => (item.presentation?.id ?? item.execution?.id) === entry.id);
      if (!registration) throw new Error("UNKNOWN_MODULE_JOURNEY");
      return { ...entry, value: registration, ...(registration.execution ? { execution: registration.execution } : {}),
        ...(registration.presentation ? { presentation: registration.presentation } : {}) };
    }
    const value = entry.kind === "command"
      ? definition.journeys?.flatMap(item => item.execution?.kind === "mutation" ? [item.execution.command] : []).find(item => item.id === entry.id)
      : definition[entry.kind === "dependency" ? "dependencies" : `${entry.kind}s` as Exclude<ModuleEntryKind, "journeys" | "dependencies">]?.find(item => item.id === entry.id);
    if (!value) throw new Error("UNKNOWN_MODULE_EXPORT");
    return { ...entry, value };
  }
  function issue(entry: LocalEntry) {
    const existing = issued.get(entry);
    if (existing) return existing;
    const token = Object.freeze({ kind: entry.kind, owner: definition.id, id: entry.id });
    references.set(token, { ...canonical(entry), module: record });
    issued.set(entry, token);
    return token;
  }
  for (const kind of moduleKinds) for (const [alias, entry] of Object.entries(aliases[kind])) {
    exports[kind][alias] = issue(entry);
    if (kind === "journeys" && entry.execution) {
      const execution = declarationRecord(entry.execution);
      if (execution.kind === "mutation") {
        const command = identities.get(execution.command as object);
        if (!command || command.kind !== "command") throw new Error("UNKNOWN_MODULE_COMMAND");
        exports.commands[alias] = issue(command);
      }
    }
  }
  for (const original of identities.keys()) ownedIdentities.add(original);
  freezeDeep(exports);
  modules.set(handle, record);
  return handle;
}

export type ReferenceUse = "reference" | "navigation" | "execution" | "read-source";
export function requireJourneyUse(entry: LocalEntry, use: ReferenceUse): void {
  if (entry.kind !== "journey") return;
  if (use === "navigation" && !entry.presentation) throw new Error("UNPRESENTED_MODULE_JOURNEY");
  if (use === "execution" && !entry.execution) throw new Error("MODULE_EXPOSURE_REQUIRES_EXECUTION");
  if (use === "read-source" && (!entry.execution || declarationRecord(entry.execution).kind !== "read" ||
    !entry.presentation || declarationRecord(entry.presentation).kind !== "read")) throw new Error("MODULE_SOURCE_REQUIRES_READ");
}
```

## src/modules/reference-types.ts

Source SHA-256: bf27e46d92a56fbd9ce95c54cb5d69b7cc91d47b5860f9b1fda3c759b12c23c4

```ts
export type ModuleReferenceKind = "object" | "dependency" | "journey" | "view" | "destination" | "command";
declare const referenceContract: unique symbol;

/** The SDK issues references; their contract is type information, not a public implementation. */
export type ModuleReference<K extends ModuleReferenceKind, Owner extends string = string, Id extends string = string, Contract = object> =
  Readonly<{ kind: K; owner: Owner; id: Id; [referenceContract]: Contract }>;
export type ReferenceContract<R> = R extends ModuleReference<ModuleReferenceKind, string, string, infer C> ? C : never;
```

## src/modules/lower-references.ts

Source SHA-256: 1bc07d4bae5879dc2f92423ff98c3bababb0796c32bc7f3f4bde57ed81ad39f4

```ts
import { declarationArray, declarationRecord } from "./declaration-data.ts";
import { moduleKinds } from "./references.ts";
import type { ReferenceAdmission } from "./admission.ts";
import { authoredActivity, type ActivityDefinition } from "../activities/authoring.ts";

/** The only lowering pass. It runs after identity admission, before canonical JSON/schema checks. */
export function lowerOwnedReferences(source: Record<string, unknown>, admission: ReferenceAdmission) {
  const resolve = (target: unknown, kind: "view" | "journey" | "destination", execution = false) =>
    admission.admit(target, kind, kind === "journey" ? execution ? "execution" : "navigation" : "reference").id;
  function view(value: unknown) {
    const item = declarationRecord(value);
    return { ...item, ...Object.fromEntries(["leftDock", "rightDock"].filter(key => Object.hasOwn(item, key)).map(key => {
      const dock = declarationRecord(item[key]);
      return [key, { ...dock, view: resolve(dock.view, "view") }];
    })) };
  }
  function presentation(value: unknown) {
    const item = declarationRecord(value);
    return {
      ...item,
      ...Object.fromEntries(["view", "detailView"].filter(key => Object.hasOwn(item, key)).map(key => [key, resolve(item[key], "view")])),
      ...(Object.hasOwn(item, "source") ? { source: admission.admit(item.source, "journey", "read-source").id } : {}),
      ...(Object.hasOwn(item, "initializeFrom") ? { initializeFrom: { ...declarationRecord(item.initializeFrom),
        source: admission.admit(declarationRecord(item.initializeFrom).source, "journey", "read-source").id } } : {}),
      ...(Object.hasOwn(item, "collections") ? { collections: declarationArray(item.collections).map(value => {
        const binding = declarationRecord(value);
        const preview = binding.preview === undefined ? undefined : declarationRecord(binding.preview);
        return { ...binding, read: admission.admit(binding.read, "journey", "read-source").id,
          ...(preview ? { preview: { ...preview, read: admission.admit(preview.read, "journey", "read-source").id } } : {}) };
      }) } : {}),
      ...(Object.hasOwn(item, "related") ? { related: declarationArray(item.related).map(value => {
        const binding = declarationRecord(value);
        const membership = binding.membership === undefined ? undefined : declarationRecord(binding.membership);
        return { ...binding, read: admission.admit(binding.read, "journey", "read-source").id,
          ...(membership ? { membership: { ...membership, update: admission.admit(membership.update, "journey", "execution").id } } : {}) };
      }) } : {}),
      ...(item.kind === "activity" ? { activity: authoredActivity(item.activity as ActivityDefinition,
        value => resolve(value, "journey", true), value => resolve(value, "view")) } : {}),
      outputs: declarationArray(item.outputs).map(value => {
        const output = declarationRecord(value), action = declarationRecord(output.action);
        return { ...output, view: resolve(output.view, "view"), action: action.kind === "journey"
          ? { ...action, journey: resolve(action.journey, "journey") } : action };
      }),
    };
  }
  function object(value: unknown) {
    const item = declarationRecord(value);
    if (!Object.hasOwn(item, "presentation")) return item;
    const publication = declarationRecord(item.presentation);
    return { ...item, presentation: { ...publication, view: resolve(publication.view, "view"),
      actions: declarationArray(publication.actions).map(value => {
        const action = declarationRecord(value);
        return { ...action, journey: resolve(action.journey, "journey", true) };
      }) } };
  }
  const transforms = {
    objects: object, views: view,
    journeys: (value: unknown) => {
      const registration = declarationRecord(value);
      return { ...registration, ...(Object.hasOwn(registration, "presentation")
        ? { presentation: presentation(registration.presentation) } : {}) };
    },
    destinations: (value: unknown) => {
      const destination = declarationRecord(value);
      return { ...destination, entryJourney: resolve(destination.entryJourney, "journey") };
    },
  };
  return { ...source, ...Object.fromEntries(Object.entries(transforms).filter(([key]) => Object.hasOwn(source, key))
    .map(([key, transform]) => [key, declarationArray(source[key]).map(transform)])),
    ...(Object.hasOwn(source, "exports") ? { exports: Object.fromEntries(moduleKinds
      .filter(kind => Object.hasOwn(declarationRecord(source.exports), kind))
      .map(kind => [kind, Object.values(admission.aliases()[kind]).map(entry => entry.id)])) } : {}),
  };
}

export function lowerProductReferences(source: Record<string, unknown>, admission: ReferenceAdmission) {
  return { ...lowerOwnedReferences(source, admission),
    workspace: admission.admit(source.workspace, "view").id,
    entry: admission.admit(source.entry, "destination").id,
    navigation: declarationArray(source.navigation).map(value => {
      const item = declarationRecord(value);
      return { ...item, destination: admission.admit(item.destination, "destination").id };
    }),
    exposures: declarationArray(source.exposures).map(value => {
      const item = declarationRecord(value);
      return { ...item, journeys: declarationArray(item.journeys).map(target => admission.admit(target, "journey", "execution").id) };
    }),
  };
}
```

## src/modules/declaration-data.ts

Source SHA-256: a0b7f6fbb95b64bf9e83a68da72e3ec3ccd5f0328c4b9445a8b8f36523734aed

```ts
/** Read declaration data without executing getters before the JSON/schema boundary. */
export function declarationRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new Error("INVALID_DECLARATION_DATA");
  if (Object.getOwnPropertySymbols(value).length) throw new Error("INVALID_DECLARATION_DATA");
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const entries = Object.entries(descriptors).map(([key, descriptor]) => {
    if (!("value" in descriptor) || !descriptor.enumerable) throw new Error("INVALID_DECLARATION_DATA");
    return [key, descriptor.value] as const;
  });
  return Object.fromEntries(entries);
}

export function declarationArray(value: unknown): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error("INVALID_DECLARATION_DATA");
  if (Object.getOwnPropertySymbols(value).length) throw new Error("INVALID_DECLARATION_DATA");
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.keys(descriptors).length !== value.length + 1) throw new Error("INVALID_DECLARATION_DATA");
  return Array.from({ length: value.length }, (_, index) => {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) throw new Error("INVALID_DECLARATION_DATA");
    return descriptor.value;
  });
}
```

## src/modules/links.ts

Source SHA-256: 541f001bd19c97314ed1714bb6e04aeed87010ac07bc9df412186d66f74e3947

```ts
import type { AuthoredView, AuthoredViewJourney, ReadJourneyTarget } from "./authored-types.ts";
import type { ModuleDefinition, ModuleEntryKind, ModuleJourney, ProductComposition } from "./types.ts";
import type { ModuleReference, ReferenceContract } from "./reference-types.ts";
import type { Message } from "../views/definition.ts";

type Elements<O, K extends PropertyKey> = K extends keyof O
  ? NonNullable<O[K]> extends readonly (infer E)[] ? E : never : never;
type Values<C> = C extends object ? C[keyof C] : never;
type Public<C, K extends PropertyKey> = K extends keyof C ? Values<C[K]> : never;
type Views<M> = Extract<Elements<M, "views">, AuthoredView>;
type LocalJourneys<M> = Elements<M, "journeys"> extends infer J
  ? J extends object ? ("execution" extends keyof J ? NonNullable<J["execution"]> : never)
    | ("presentation" extends keyof J ? NonNullable<J["presentation"]> : never) : never : never;
type Outputs<V> = V extends { readonly outputs: readonly (infer O extends string)[] } ? O : never;
type ViewTargets<M, C> = Views<M> | Public<C, "views">;
type JourneyTargets<M, C> = LocalJourneys<M> | Public<C, "journeys">;
type DestinationTargets<M, C> = Elements<M, "destinations"> | Public<C, "destinations">;
type ViewDefinition<V> = V extends ModuleReference<"view"> ? ReferenceContract<V> : V;
type Action = AuthoredViewJourney["outputs"][number]["action"];
type LinkedAction<M, C, A = Action> = A extends { readonly journey: unknown }
  ? Omit<A, "journey"> & { readonly journey: JourneyTargets<M, C> } : A;
type LinkedOutput<M, C, V = ViewTargets<M, C>> = V extends object
  ? { readonly view: V; readonly output: Outputs<ViewDefinition<V>>; readonly action: LinkedAction<M, C> } : never;
type LinkedJourney<M, C, J = AuthoredViewJourney> = J extends AuthoredViewJourney ? {
  readonly [K in keyof J]: K extends "view" | "detailView" ? ViewTargets<M, C>
    : K extends "source" ? Extract<JourneyTargets<M, C>, ReadJourneyTarget>
    : K extends "outputs" ? readonly LinkedOutput<M, C>[] : J[K];
} : never;
type EmittingContent<V, C> = C extends { readonly kind: "stack"; readonly items: readonly unknown[] }
  ? Omit<C, "items"> & { readonly items: readonly EmittingContent<V, C["items"][number]>[] }
  : C extends { readonly output: unknown } ? Omit<C, "output"> & { readonly output: Outputs<V> } : C;
type Toolbar<V, T> = T extends { readonly actions: readonly (infer A)[] }
  ? Omit<T, "actions"> & { readonly actions: readonly EmittingContent<V, A>[] } : T;
type Dock<M, C, D> = D extends { readonly view: unknown } ? Omit<D, "view"> & { readonly view: ViewTargets<M, C> } : D;
type LinkedView<M, C, V extends AuthoredView> = {
  readonly [K in keyof V]: K extends "topDock" | "bottomDock" ? Toolbar<V, V[K]>
    : K extends "leftDock" | "rightDock" ? Dock<M, C, V[K]>
    : K extends "content" ? readonly EmittingContent<V, V["content"][number]>[] : V[K];
};
type OwnerLinks<M, C = never> = {
  readonly views?: readonly (Views<M> extends infer V ? V extends AuthoredView ? LinkedView<M, C, V> : never : never)[];
  readonly journeys?: readonly (Omit<ModuleJourney, "presentation"> & { readonly presentation?: LinkedJourney<M, C> })[];
  readonly destinations?: readonly (Elements<M, "destinations"> extends infer D ? D extends object
    ? Omit<D, "entryJourney"> & { readonly entryJourney: JourneyTargets<M, C> } : never : never)[];
};
export type ModuleLinks<M extends ModuleDefinition> = OwnerLinks<M> & {
  readonly exports?: { readonly [K in ModuleEntryKind]?: Readonly<Record<string,
    K extends "journeys" ? LocalJourneys<M> : Elements<M, K>>> };
};
export type ProductLinks<P extends ProductComposition> = OwnerLinks<P, P["modules"]> & {
  readonly workspace: ViewTargets<P, P["modules"]>;
  readonly entry: DestinationTargets<P, P["modules"]>;
  readonly navigation: readonly { readonly destination: DestinationTargets<P, P["modules"]>;
    readonly group: Message; readonly purpose: "content" | "utility" }[];
};
```

## src/modules/module-source.ts

Source SHA-256: 922d5c85ec7fd0665f08e1686928c0b6464d276a4d27b9bb1f133b357c13e94b

```ts
type Property = readonly [PropertyKey, unknown, boolean];
type Declaration = { value: object; prototype: object | null; properties: readonly Property[] };
type Registration = { handle: object; declarations: readonly Declaration[] };
const registrations = new WeakMap<object, Registration>();

function declarationGraph(source: object): readonly Declaration[] {
  const visited = new Set<object>();
  const declarations: Declaration[] = [];
  function visit(value: object) {
    if (visited.has(value)) return;
    visited.add(value);
    const properties: Property[] = Reflect.ownKeys(value).map(key => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      if (!("value" in descriptor)) throw new Error("INVALID_DECLARATION_DATA");
      return [key, descriptor.value, descriptor.enumerable === true];
    });
    declarations.push({ value, prototype: Object.getPrototypeOf(value), properties });
    for (const [, child] of properties) if (typeof child === "object" && child !== null) visit(child);
  }
  visit(source);
  return declarations;
}

export function registeredModuleSource(source: object): object | undefined {
  const registered = registrations.get(source);
  if (!registered) return;
  for (const { value, prototype, properties } of registered.declarations) {
    if (Object.getPrototypeOf(value) !== prototype) throw new Error("MUTATED_MODULE_DEFINITION");
    const keys = Reflect.ownKeys(value);
    if (keys.length !== properties.length) throw new Error("MUTATED_MODULE_DEFINITION");
    for (const [index, [key, original, enumerable]] of properties.entries()) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (keys[index] !== key || !descriptor || !("value" in descriptor)
        || !Object.is(descriptor.value, original) || descriptor.enumerable !== enumerable) {
        throw new Error("MUTATED_MODULE_DEFINITION");
      }
    }
  }
  return registered.handle;
}

export function rememberModuleSource(source: object, handle: object): void {
  registrations.set(source, { handle, declarations: declarationGraph(source) });
}
```

## src/human-exposure.ts

Source SHA-256: ded08aceea330e2ee0d625cec872d137fb1cf52458a89ac0034826e748655a9f

```ts
import { Type, type Static } from "@sinclair/typebox";
import { closed, name } from "./views/definition.ts";
import { ViewExposureSchema } from "./program-grammar.ts";
import { requireProgramOwnedNavigation, type WithoutSurfaceNavigation } from "./navigation-ownership.ts";
import { runtimeConnectionPolicyFor } from "./connection-policy.ts";
import type { Frozen } from "./json.ts";

export const AuthoredHumanExposureSchema = closed({
  id: name, kind: Type.Literal("human"), locale: name,
  journeys: Type.Array(name, { minItems: 1, uniqueItems: true }),
});
export const AuthoredExposureSchema = Type.Union([ViewExposureSchema.anyOf[0], AuthoredHumanExposureSchema]);
export type AuthoredHumanExposure = Frozen<Static<typeof AuthoredHumanExposureSchema>>;
const journeyOwnedSurfaceKeys = ["inputs", "fieldRepresentations", "fieldKinds", "commit", "language"] as const;
export type WithoutSurfaceSemantics = WithoutSurfaceNavigation & { readonly connection?: never } & {
  readonly [Key in typeof journeyOwnedSurfaceKeys[number]]?: never;
};

export function requireJourneyOwnedSurfaceSemantics(surface: object): void {
  requireProgramOwnedNavigation(surface);
  runtimeConnectionPolicyFor(surface);
  if (journeyOwnedSurfaceKeys.some(key => Object.hasOwn(surface, key))) {
    throw new Error("SURFACE_SEMANTICS_FORBIDDEN");
  }
}
```

## src/navigation-ownership.ts

Source SHA-256: 2396ae297f87a3cec924beaf7c6e506ba37ade4512f1da1b7cc16c19b8190c23

```ts
const surfaceNavigationKeys = ["navigation", "entry", "primaryAction", "subjectActions"] as const;

export type WithoutSurfaceNavigation = {
  readonly [Key in typeof surfaceNavigationKeys[number]]?: never;
};

export function requireProgramOwnedNavigation(surface: object): void {
  if (surfaceNavigationKeys.some(key => Object.hasOwn(surface, key))) {
    throw new Error("DUPLICATE_NAVIGATION_OWNER");
  }
}
```

## src/connection-policy.ts

Source SHA-256: 15257b5925e6078e586f5a18019044237963bfe57f7c073c3e6dcc54305d8404

```ts
import { Type } from "@sinclair/typebox";

export const RuntimeConnectionPolicy = Object.freeze({
  availability: "journey-dependencies",
  draftRetention: "session-memory",
  reconnect: "refresh-without-replay",
} as const);

export const ConnectionPolicySchema = Type.Object({
  availability: Type.Literal(RuntimeConnectionPolicy.availability),
  draftRetention: Type.Literal(RuntimeConnectionPolicy.draftRetention),
  reconnect: Type.Literal(RuntimeConnectionPolicy.reconnect),
}, { additionalProperties: false });

export function runtimeConnectionPolicyFor(definition: object) {
  if (Object.hasOwn(definition, "connection")) throw new Error("SURFACE_CONNECTION_POLICY_FORBIDDEN");
  return RuntimeConnectionPolicy;
}
```

## src/surface-fields.ts

Source SHA-256: bd959d21f44188ed79ea617d4093966866d9b225310ab54a8a3baaae7bb27a22

```ts
import type { Frozen } from "./json.ts";
import type { JourneyDefinition } from "./program-grammar.ts";
import { commandInputTargets } from "./command-input-targets.ts";
import type { ObjectDefinition } from "./contracts.ts";

export type SurfaceField = { readonly object: string; readonly field: string };
export function surfaceFieldKinds(fields: ReadonlyMap<string, SurfaceField>, objects: ReadonlyMap<string, ObjectDefinition>) {
  return Object.fromEntries([...fields].map(([key, reference]) =>
    [key, objects.get(reference.object)!.facts[reference.field]!.kind]));
}

export function surfaceFields(journeys: readonly Frozen<JourneyDefinition>[]) {
  const identities = new Map<string, SurfaceField>();
  const presented = new Map<string, SurfaceField>();
  const editable = new Map<string, SurfaceField>();
  function register(target: Map<string, SurfaceField>, object: string, field: string) {
    const key = `${object}.${field}`;
    const existing = identities.get(key);
    if (existing && (existing.object !== object || existing.field !== field)) {
      throw new Error("AMBIGUOUS_SURFACE_FIELD_KEY");
    }
    const reference = existing ?? { object, field };
    identities.set(key, reference);
    target.set(key, reference);
  }
  for (const journey of journeys) {
    const object = journey.kind === "read" ? journey.object : journey.command.object;
    const fields = journey.kind === "read" ? [...journey.fields, ...journey.collection]
      : [...journey.command.input, ...(journey.command.kind === "create"
        ? commandInputTargets(journey.command) : Object.keys(journey.command.set))];
    for (const field of fields) register(presented, object, field);
    if (journey.kind === "mutation") {
      for (const field of journey.command.input) register(editable, object, field);
    }
  }
  return { presented, editable };
}
```

## src/field-definition.ts

Source SHA-256: 311977ec3dea3a4e1f831fdcf678d63cef951f9f00fe49ea51ab528b7347718a

```ts
import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { labelLimits } from "./labels.ts";

const TextField = Type.Object({
  kind: Type.Literal("text"),
  minLength: Type.Optional(Type.Integer({ minimum: 0 })),
  maxLength: Type.Optional(Type.Integer({ minimum: 0 })),
}, { additionalProperties: false });

const IntegerField = Type.Object({
  kind: Type.Literal("integer"),
  minimum: Type.Optional(Type.Integer({ minimum: Number.MIN_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER })),
  maximum: Type.Optional(Type.Integer({ minimum: Number.MIN_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER })),
}, { additionalProperties: false });

const PrincipalField = Type.Object({ kind: Type.Literal("principal") }, { additionalProperties: false });
const ImageAssetField = Type.Object({ kind: Type.Literal("asset"), media: Type.Literal("image") }, { additionalProperties: false });
const MediaAssetField = Type.Object({ kind: Type.Literal("asset"), media: Type.Literal("media") }, { additionalProperties: false });
const LabelConstraintsSchema = Type.Object({
  maxItems: Type.Optional(Type.Integer({ minimum: 1, maximum: labelLimits.maxItems })),
  maxLength: Type.Optional(Type.Integer({ minimum: 1, maximum: labelLimits.maxLength })),
}, { additionalProperties: false });
const LabelsField = Type.Object({ kind: Type.Literal("labels"),
  maxItems: Type.Integer({ minimum: 1, maximum: 200 }),
  maxLength: Type.Integer({ minimum: 1, maximum: labelLimits.maxLength }),
  reference: Type.Optional(Type.Union([Type.Object({ object: Type.String({minLength:1}), label: Type.String({minLength:1}),
    color: Type.Optional(Type.String({minLength:1})) }, {additionalProperties:false}),
    Type.Object({object:Type.String({minLength:1}),media:Type.String({minLength:1}),memberOf:Type.Optional(Type.String({minLength:1})),
      where:Type.Optional(Type.Record(Type.String(),Type.String({minLength:1})))},{additionalProperties:false})])),
}, { additionalProperties: false });
const EnumField = Type.Object({ kind: Type.Literal("enum"), values: Type.Array(Type.String({ minLength: 1 }), {
  minItems: 1, uniqueItems: true,
}) }, { additionalProperties: false });

export const FieldDefinitionSchema = Type.Union([TextField, IntegerField, PrincipalField, EnumField, ImageAssetField, MediaAssetField, LabelsField]);
export type FieldDefinition = Static<typeof FieldDefinitionSchema>;

export function text(options: Omit<Static<typeof TextField>, "kind"> = {}): Static<typeof TextField> {
  return { ...options, kind: "text" };
}

export function integer(options: Omit<Static<typeof IntegerField>, "kind"> = {}): Static<typeof IntegerField> {
  return { ...options, kind: "integer" };
}

export function principal(): Static<typeof PrincipalField> { return { kind: "principal" }; }
export function imageAsset(): Readonly<Static<typeof ImageAssetField>> {
  if (arguments.length) throw new Error("IMAGE_ASSET_OPTIONS_FORBIDDEN");
  return Object.freeze({ kind: "asset", media: "image" });
}
export function mediaAsset(): Readonly<Static<typeof MediaAssetField>> {
  if (arguments.length) throw new Error("MEDIA_ASSET_OPTIONS_FORBIDDEN");
  return Object.freeze({kind:"asset",media:"media"});
}
export function labels(options: Static<typeof LabelConstraintsSchema> = {}): Readonly<Static<typeof LabelsField>> {
  if (!Check(LabelConstraintsSchema, options)) throw new Error("INVALID_LABELS_DEFINITION");
  return Object.freeze({ kind: "labels", ...labelLimits, ...options });
}
/** A bounded many-reference value. Target labels/colors are presentation, never stored in the association. */
export function references<const O extends {readonly id:string; readonly facts:Readonly<Record<string, FieldDefinition>>}>(
  object:O, options:{label:{[K in keyof O['facts']]:O['facts'][K] extends {kind:'text'} ? K : never}[keyof O['facts']];
    color:{[K in keyof O['facts']]:O['facts'][K] extends {kind:'enum'} ? K : never}[keyof O['facts']]},
): Readonly<Static<typeof LabelsField>> {
  if (!object?.id || !options || Object.keys(options).length !== 2 || object.facts[options.label]?.kind !== 'text'
    || object.facts[options.color]?.kind !== 'enum') throw new Error('INVALID_REFERENCE_DEFINITION');
  return Object.freeze({kind:'labels',maxItems:12,maxLength:36,
    reference:Object.freeze({object:object.id,label:String(options.label),color:String(options.color)})});
}
export function enumeration<const V extends [string, ...string[]]>(values: V) {
  return { kind: "enum" as const, values };
}
export function mediaReferences(object:string | {readonly id:string;readonly facts:Readonly<Record<string,FieldDefinition>>},
  options:{media:string;maxItems?:number;memberOf?:string;where?:Readonly<Record<string,string>>}) {
  const id=typeof object==='string' ? object : object?.id;
  if (!id || !options || Object.keys(options).some(key=>!['media','maxItems','memberOf','where'].includes(key)) || !options.media
    || typeof object !== 'string' && object.facts[options.media]?.kind !== 'asset'
    || options.maxItems !== undefined && (!Number.isInteger(options.maxItems) || options.maxItems<1 || options.maxItems>200)
    || options.memberOf !== undefined && !options.memberOf) throw new Error('INVALID_REFERENCE_DEFINITION');
  return Object.freeze({kind:'labels' as const,maxItems:options.maxItems ?? 200,maxLength:36,
    reference:Object.freeze({object:id,media:options.media,...(options.memberOf?{memberOf:options.memberOf}:{}),...(options.where?{where:{...options.where}}:{})})});
}
export function namedReferences<const O extends {readonly id:string;readonly facts:Readonly<Record<string,FieldDefinition>>}>(object:O,
  options:{label:{[K in keyof O['facts']]:O['facts'][K] extends {kind:'text'} ? K : never}[keyof O['facts']]}) {
  if (!object?.id || !options || Object.keys(options).length !== 1 || object.facts[options.label]?.kind !== 'text') throw new Error('INVALID_REFERENCE_DEFINITION');
  return Object.freeze({kind:'labels' as const,maxItems:12,maxLength:36,reference:Object.freeze({object:object.id,label:String(options.label)})});
}
```

## src/field-representation.ts

Source SHA-256: 25379afa2a202dfd506491d33251b4f3c132d1a02678908f60986a70bfb1d692

```ts
import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { FieldDefinitionSchema, type FieldDefinition } from "./field-definition.ts";

export const FieldRepresentationSchema = Type.Union([Type.Literal("text"), Type.Literal("paragraphs"), Type.Literal("image"), Type.Literal("tags")]);
export type FieldRepresentation = Static<typeof FieldRepresentationSchema>;
export const FieldRepresentationsSchema = Type.Record(Type.String({ minLength: 1 }), FieldRepresentationSchema,
  { additionalProperties: false });
const FieldKindSchema = Type.Index(FieldDefinitionSchema, ["kind"]);
export const FieldKindsSchema = Type.Record(Type.String({ minLength: 1 }), FieldKindSchema, { additionalProperties: false });
export type FieldKind = Static<typeof FieldKindSchema>;

export function supportsFieldRepresentation(fact: Pick<FieldDefinition, "kind">, representation: FieldRepresentation): boolean {
  if (fact.kind === "asset") return representation === "image";
  if (fact.kind === "labels") return representation === "tags";
  return representation !== "image" && representation !== "tags" && fact.kind !== "principal" && (representation !== "paragraphs" || fact.kind === "text");
}

export function requireFieldRepresentations(value: unknown, fields: Iterable<string>): asserts value is Record<string, FieldRepresentation> {
  if (!Check(FieldRepresentationsSchema, value)) throw new Error("INVALID_FIELD_REPRESENTATIONS");
  const expected = new Set(fields);
  for (const name of Object.keys(value)) {
    if (!expected.has(name)) throw new Error(`Unknown field representation: ${name}`);
  }
  for (const name of expected) {
    if (!Object.hasOwn(value, name)) throw new Error(`Missing field representation: ${name}`);
  }
}

export function requireFieldKinds(value: unknown, fields: Iterable<string>): asserts value is Record<string, FieldKind> {
  if (!Check(FieldKindsSchema, value)) throw new Error("INVALID_FIELD_KINDS");
  const expected = new Set(fields);
  for (const name of Object.keys(value)) {
    if (!expected.has(name)) throw new Error(`Unknown field kind: ${name}`);
  }
  for (const name of expected) {
    if (!Object.hasOwn(value, name)) throw new Error(`Missing field kind: ${name}`);
  }
}

export function requireFieldPresentation(representations: unknown, kinds: unknown, fields: Iterable<string>) {
  const names = [...fields];
  requireFieldRepresentations(representations, names);
  requireFieldKinds(kinds, names);
  for (const [name, representation] of Object.entries(representations)) {
    if (!supportsFieldRepresentation({ kind: kinds[name]! }, representation)) {
      throw new Error(`Field representation type mismatch: ${name}`);
    }
  }
  return { fieldRepresentations: representations, fieldKinds: kinds };
}

export function requireFieldRepresentation(representations: Readonly<Record<string, FieldRepresentation>>, field: string): FieldRepresentation {
  const representation = Object.hasOwn(representations, field) ? representations[field] : undefined;
  if (!Check(FieldRepresentationSchema, representation)) throw new Error(`INVALID_FIELD_REPRESENTATION: ${field}`);
  return representation;
}
```

## src/command-input-targets.ts

Source SHA-256: ba794c6311332cb3c481a84e27742f004e9bf50b406344778c5ac29cdccaa588

```ts
import type { Frozen } from "./json.ts";
import type { CommandDefinition } from "./program-grammar.ts";

export function commandInputTargets(command: Frozen<CommandDefinition>): string[] {
  const assignments = command.kind === "create" ? command.values : command.set;
  return Object.entries(assignments).flatMap(([target, expression]) =>
    expression.kind === "input" && command.input.includes(expression.field) ? [target] : []);
}
```

## src/preparation-projection.ts

Source SHA-256: 44309173797bb7423972308f0588f7a63134d3070a80e08d2bcfa1bb60a7f2f5

```ts
import type { ProductDefinition } from "./contracts.ts";
import type { compileProgram } from "./compile-program.ts";
import type { JourneyDefinition, ExposureDefinition } from "./program-grammar.ts";
import { commandInputTargets } from "./command-input-targets.ts";

export function preparationFields(product: ProductDefinition, program: ReturnType<typeof compileProgram>,
  surface: ExposureDefinition, journey: Extract<JourneyDefinition, { kind: "mutation" }>) {
  const command = journey.command;
  const owner = product.policies?.find(policy => policy.object === command.object)?.field;
  const reads = surface.journeys.map(id => program.journeys.get(id)!)
    .filter(journey => journey.kind === "read" && journey.object === command.object);
  const details = reads.flatMap(journey => journey.kind === "read" ? journey.fields : []);
  const exposed = new Set([...commandInputTargets(command), ...details,
    ...reads.flatMap(journey => journey.kind === "read" ? journey.collection : [])]);
  const effects = Object.keys(command.kind === "create" ? command.values : command.set).filter(name => name !== owner);
  if (surface.kind === "human" && surface.commit[journey.id] === "review") {
    for (const name of effects) {
      if (!exposed.has(name)) throw new Error(`UNSUPPORTED_REVIEW_PROJECTION: ${journey.id}.${name}`);
    }
  }
  return [...new Set([...details, ...effects.filter(name => exposed.has(name))])].filter(name => name !== owner);
}
```

## src/interaction/protocol.ts

Source SHA-256: ab511bdf04c382c4f7e5ad4994f9461343cc8cd48f8ea3330c3b0d3e4503e123

```ts
export const InteractionProtocolVersion = "desert.interaction/7" as const;
```

## src/authoring/index.ts

Source SHA-256: 56f9562cd3297009b7c0aff6d3cd7cc38649da4ccdd37e997034fd6653f0fa6d

```ts
import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import ts from "typescript";
import { checkDeclarations } from "./syntax.ts";
import { checkImport, viewImportProvenance } from "./imports.ts";
import { assertNoLiteralText, assertProductMessageKeys, isProductBundle, productKeysModule } from "./messages.ts";
import { bundleLocale } from "../messages/generate.ts";

/** Build-time declaration boundary, not an isolation sandbox for malicious TypeScript. */
export async function assertProductSource(directory: string): Promise<{ files: readonly string[] }> {
  if ((await lstat(directory)).isSymbolicLink()) throw new Error("PRODUCT_SYMLINK_NOT_ALLOWED");
  const root = await realpath(directory);
  const sources = new Map<string, string>();
  const bundles = new Map<string, string>();
  async function collect(folder: string): Promise<void> {
    for (const item of await readdir(folder, { withFileTypes: true })) {
      const path = join(folder, item.name);
      if (item.isSymbolicLink()) throw new Error(`PRODUCT_SYMLINK_NOT_ALLOWED: ${relative(root, path)}`);
      if (item.isDirectory()) await collect(path);
      else {
        if (item.isFile() && isProductBundle(root, path)) { bundles.set(bundleLocale(item.name) ?? "", await readFile(path, "utf8")); continue; }
        if (!item.isFile() || !item.name.endsWith(".ts")) {
          throw new Error(`PRODUCT_FILE_NOT_ALLOWED: ${relative(root, path)}`);
        }
        sources.set(path, await readFile(path, "utf8"));
      }
    }
  }
  await collect(root);
  if (sources.size === 0) throw new Error("EMPTY_PRODUCT_SOURCE");
  assertProductMessageKeys(bundles, sources.get(join(root, productKeysModule)));
  const edges = new Map<string, { target: string; declaration: ts.ImportDeclaration | ts.ExportDeclaration }[]>();
  const files = new Map<string, ts.SourceFile>();
  let roots = 0;
  for (const [path, text] of sources) {
    const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    files.set(path, file);
    const targets: { target: string; declaration: ts.ImportDeclaration | ts.ExportDeclaration }[] = [];
    roots += checkDeclarations(file, (specifier, declaration) => {
      const target = checkImport(root, path, specifier);
      if (target) {
        if (!sources.has(target)) throw new Error(`PRODUCT_IMPORT_MISSING: ${specifier} in ${relative(root, path)}`);
        if (ts.isImportDeclaration(declaration) || ts.isExportDeclaration(declaration)) targets.push({ target, declaration });
      }
    });
    edges.set(path, targets);
  }
  // A declaration that is otherwise legal still writes no sentence (plan §14).
  for (const file of files.values()) assertNoLiteralText(root, file);
  const active = new Set<string>();
  const checked = new Set<string>();
  function visit(path: string) {
    if (active.has(path)) throw new Error(`PRODUCT_IMPORT_CYCLE: ${relative(root, path)}`);
    if (checked.has(path)) return;
    active.add(path);
    for (const { target } of edges.get(path) ?? []) visit(target);
    active.delete(path); checked.add(path);
  }
  for (const path of sources.keys()) visit(path);
  const viewOnly = viewImportProvenance(files);
  function viewDependencies(path: string, visited = new Set<string>()) {
    if (visited.has(path)) return;
    visited.add(path);
    for (const { target, declaration } of edges.get(path) ?? []) {
      if (viewOnly(path, declaration)) continue;
      if (target.endsWith(".journey.ts") || target.endsWith(".module.ts")) throw new Error("VIEW_ACTIVITY_IMPORT");
      viewDependencies(target, visited);
    }
  }
  for (const path of sources.keys()) if (path.endsWith(".view.ts")) viewDependencies(path);
  if (roots !== 1 || [...sources.keys()].filter(path => path.endsWith(".product.ts")).length !== 1) {
    throw new Error("SINGLE_PRODUCT_ROOT_REQUIRED");
  }
  return Object.freeze({ files: Object.freeze([...sources.keys()].map(path => relative(resolve(root), path)).sort()) });
}
```

## src/authoring/imports.ts

Source SHA-256: 47266cdd9f5bcde34b812b33c7e6d93c0b4fe80bed6017eac439c0b248db349e

```ts
import { dirname, relative, resolve, sep } from "node:path";
import ts from "typescript";
import { messageKeysFile, messagesFolder } from "../messages/generate.ts";

export const authoringEntrypoint = "desert-sdk/src/index.ts";
/** The generated message keys of the product (plan §14): the one product file any module, view or root may import. */
export const productKeysModule = `${messagesFolder}/${messageKeysFile}`;
const owner = (file: string) => /^modules\/([^/]+)\//.exec(file)?.[1];

export function checkImport(root: string, file: string, specifier: string): string | undefined {
  if (specifier === authoringEntrypoint) return;
  if (!specifier.startsWith(".")) throw new Error(`PRODUCT_IMPORT_NOT_ALLOWED: ${specifier}`);
  const target = resolve(dirname(file), specifier);
  const sourceName = relative(root, file).split(sep).join("/");
  const targetName = relative(root, target).split(sep).join("/");
  if (targetName === ".." || targetName.startsWith("../")) throw new Error("PRODUCT_IMPORT_OUTSIDE_SOURCE");
  if (!target.endsWith(".ts")) throw new Error(`PRODUCT_IMPORT_NOT_ALLOWED: ${specifier}`);
  if (targetName === productKeysModule) return target;
  const from = owner(sourceName), to = owner(targetName);
  if (to && targetName.endsWith(".module.ts") && targetName !== `modules/${to}/${to}.module.ts`) {
    throw new Error(`MODULE_ENTRYPOINT_REQUIRED: ${targetName}`);
  }
  if (sourceName.endsWith(".view.ts") && (targetName.endsWith(".journey.ts") || targetName.endsWith(".module.ts"))) {
    throw new Error("VIEW_ACTIVITY_IMPORT");
  }
  if (from && to !== from) throw new Error(`CROSS_MODULE_IMPORT: ${sourceName} -> ${targetName}`);
  if (!from && to && !targetName.endsWith(".module.ts")) throw new Error(`PRIVATE_MODULE_IMPORT: ${targetName}`);
  return target;
}

type ImportEdge = ts.ImportDeclaration | ts.ExportDeclaration;
type CatalogOrigin = "constructor" | "catalog" | "views" | "view" | undefined;

/** Only a binding proven to originate in an SDK catalog's View projection may cross activity imports. */
export function viewImportProvenance(files: ReadonlyMap<string, ts.SourceFile>) {
  const cache = new Map<string, CatalogOrigin>();
  const active = new Set<string>();
  const targetOf = (file: string, node: ImportEdge) => node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
    ? resolve(dirname(file), node.moduleSpecifier.text) : undefined;
  function expression(file: string, node: ts.Expression): CatalogOrigin {
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)
      || ts.isNonNullExpression(node)) return expression(file, node.expression);
    if (ts.isIdentifier(node)) return binding(file, node.text, false);
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)
      && binding(file, node.expression.text, false) === "constructor") return "catalog";
    if (ts.isPropertyAccessExpression(node) && !node.questionDotToken) {
      const base = expression(file, node.expression);
      if (base === "catalog" && node.name.text === "views") return "views";
      if (base === "views") return "view";
    }
    return undefined;
  }
  function lookup(file: string, name: string, exported: boolean): CatalogOrigin {
    for (const statement of files.get(file)?.statements ?? []) {
      if (ts.isImportDeclaration(statement) && !exported) {
        const clause = statement.importClause;
        if (!clause || clause.isTypeOnly || !clause.namedBindings || !ts.isNamedImports(clause.namedBindings)) continue;
        const imported = clause.namedBindings.elements.find(item => !item.isTypeOnly && item.name.text === name);
        if (!imported) continue;
        const original = (imported.propertyName ?? imported.name).text;
        if (ts.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text === authoringEntrypoint) {
          return original === "moduleIndex" ? "constructor" : undefined;
        }
        const target = targetOf(file, statement);
        return target ? binding(target, original, true) : undefined;
      }
      if (ts.isVariableStatement(statement)
        && (!exported || statement.modifiers?.some(item => item.kind === ts.SyntaxKind.ExportKeyword))) {
        const declaration = statement.declarationList.declarations.find(item => ts.isIdentifier(item.name) && item.name.text === name);
        if (declaration?.initializer) return expression(file, declaration.initializer);
      }
      if (exported && ts.isExportDeclaration(statement) && !statement.isTypeOnly
        && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        const item = statement.exportClause.elements.find(item => !item.isTypeOnly && item.name.text === name);
        if (!item) continue;
        const original = (item.propertyName ?? item.name).text;
        const target = targetOf(file, statement);
        return binding(target ?? file, original, Boolean(target));
      }
    }
    return undefined;
  }
  function binding(file: string, name: string, exported: boolean): CatalogOrigin {
    const key = `${file}\0${exported ? "export" : "local"}\0${name}`;
    if (cache.has(key)) return cache.get(key);
    if (active.has(key)) return undefined;
    active.add(key);
    const origin = lookup(file, name, exported);
    active.delete(key);
    cache.set(key, origin);
    return origin;
  }
  return (file: string, node: ImportEdge): boolean => {
    const target = targetOf(file, node);
    if (!target) return false;
    const names = ts.isImportDeclaration(node)
      ? node.importClause && !node.importClause.isTypeOnly && node.importClause.namedBindings
        && ts.isNamedImports(node.importClause.namedBindings) ? node.importClause.namedBindings.elements : undefined
      : !node.isTypeOnly && node.exportClause && ts.isNamedExports(node.exportClause) ? node.exportClause.elements : undefined;
    return Boolean(names?.length && names.every(item => {
      if (item.isTypeOnly) return false;
      const origin = binding(target, (item.propertyName ?? item.name).text, true);
      return origin === "views" || origin === "view";
    }));
  };
}
```

## src/authoring/syntax.ts

Source SHA-256: 4f13e01ab14c57c80004d13db7e35f167a867fde23d15ed6394ca9525cc108a4

```ts
import ts from "typescript";
import { authoringEntrypoint } from "./imports.ts";
import { declarationExpression, type Scope } from "./expressions.ts";

function checkExplicitTypes(node: ts.Node): void {
  if (node.kind === ts.SyntaxKind.AnyKeyword || node.kind === ts.SyntaxKind.UnknownKeyword) {
    throw new Error("PRODUCT_ERASED_TYPE_NOT_ALLOWED");
  }
  ts.forEachChild(node, checkExplicitTypes);
}

function checkTypeSuppressions(file: ts.SourceFile): void {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, file.text);
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (token !== ts.SyntaxKind.SingleLineCommentTrivia && token !== ts.SyntaxKind.MultiLineCommentTrivia) continue;
    if (scanner.getTokenText().split(/[\r\n]/u).some(line => /^\s*(?:\/|\*)*\s*@ts-(?:ignore|nocheck|expect-error)/u.test(line))) {
      throw new Error("PRODUCT_TYPE_SUPPRESSION_NOT_ALLOWED");
    }
  }
}

export function checkDeclarations(file: ts.SourceFile, imported: (specifier: string, node: ts.Node) => void): number {
  checkTypeSuppressions(file);
  const scope: Scope = { bindings: new Set(), calls: new Map(), modules: new Set(), roots: new Set() };
  const manifest = file.fileName.endsWith(".module.ts");
  let roots = 0;
  function moduleSpecifier(node: ts.ImportDeclaration | ts.ExportDeclaration) {
    if (!node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) throw new Error("PRODUCT_IMPORT_NOT_ALLOWED");
    imported(node.moduleSpecifier.text, node);
    return node.moduleSpecifier.text;
  }
  for (const statement of file.statements) {
    if (ts.isImportDeclaration(statement)) {
      const specifier = moduleSpecifier(statement);
      const clause = statement.importClause;
      if (!clause || clause.name || !clause.namedBindings || !ts.isNamedImports(clause.namedBindings)
        || statement.attributes) throw new Error("PRODUCT_IMPORT_NOT_ALLOWED");
      for (const binding of clause.namedBindings.elements) {
        if (!clause.isTypeOnly && !binding.isTypeOnly) {
          scope.bindings.add(binding.name.text);
          if (specifier.endsWith(".module.ts")) scope.modules.add(binding.name.text);
          if (specifier === authoringEntrypoint) scope.calls.set(binding.name.text, (binding.propertyName ?? binding.name).text);
        }
      }
    } else if (ts.isVariableStatement(statement)) {
      for (const binding of statement.declarationList.declarations) {
        if (ts.isIdentifier(binding.name)) scope.bindings.add(binding.name.text);
      }
    }
  }
  for (const statement of file.statements) {
    if (ts.isImportDeclaration(statement) || ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) continue;
    if (ts.isExportDeclaration(statement)) {
      if (manifest && !statement.isTypeOnly) throw new Error("MODULE_PUBLIC_BOUNDARY");
      if (!statement.exportClause || !ts.isNamedExports(statement.exportClause)) throw new Error("PRODUCT_EXPORT_NOT_ALLOWED");
      if (statement.moduleSpecifier) {
        const target = moduleSpecifier(statement);
        if (!statement.isTypeOnly && target.endsWith(".module.ts")) throw new Error("MODULE_MANIFEST_ACCESS");
      }
      else if (!statement.isTypeOnly) {
        for (const item of statement.exportClause.elements) {
          if (!item.isTypeOnly) declarationExpression(item.propertyName ?? item.name, scope);
        }
      }
      continue;
    }
    if (!ts.isVariableStatement(statement) || !(statement.declarationList.flags & ts.NodeFlags.Const)) {
      throw new Error(`PRODUCT_STATEMENT_NOT_ALLOWED: ${ts.SyntaxKind[statement.kind]}`);
    }
    const exported = statement.modifiers?.some(item => item.kind === ts.SyntaxKind.ExportKeyword);
    for (const binding of statement.declarationList.declarations) {
      if (!ts.isIdentifier(binding.name) || !binding.initializer) throw new Error("PRODUCT_DECLARATION_NOT_ALLOWED");
      // Source identities are inferred. `satisfies` checks a contract without widening them.
      if (binding.type) throw new Error("PRODUCT_TYPE_ANNOTATION_NOT_ALLOWED");
      const value = binding.initializer;
      if (ts.isCallExpression(value) && ts.isIdentifier(value.expression)) {
        const call = scope.calls.get(value.expression.text);
        if (call === "composeProduct") {
          if (!file.fileName.endsWith(".product.ts") || !exported) throw new Error("PRODUCT_ROOT_REQUIRED");
          roots++;
          scope.roots.add(value);
        }
        if (call === "defineModule") {
          if (!manifest) throw new Error("MODULE_ENTRYPOINT_REQUIRED");
          scope.roots.add(value);
        }
      }
      if (manifest && exported && !(ts.isCallExpression(value) && ts.isIdentifier(value.expression)
        && scope.calls.get(value.expression.text) === "defineModule")) throw new Error("MODULE_PUBLIC_BOUNDARY");
      declarationExpression(value, scope);
    }
  }
  checkExplicitTypes(file);
  return roots;
}
```

## src/authoring/expressions.ts

Source SHA-256: 0b16539e6ef6e5f34bf95a387ee920ea9b72ec7d0c3e6dad2a915631d772a163

```ts
import ts from "typescript";
import { Components } from "../views/components.ts";

// Only installed, side-effect-free authoring constructors can run in product source.
export const authoringCalls = new Set([
  "objectType", "text", "integer", "enumeration", "principal", "imageAsset", "mediaAsset", "labels", "references", "namedReferences", "mediaReferences",
  "createCommand", "updateCommand", "fromInput", "literal", "actorId",
  "mutationJourney", "readJourney", "ownershipPolicy", "humanExposure", "agentExposure",
  "controllerRole", "capability", "view", "inputMask",
  "defineModule", "composeProduct", "moduleIndex",
  "publishObject", "viewPorts", "factReference", "viewOutput", "initializeInput", "chooseFile", "defineView",
  "activityInputs", "activityExperience", "messageCatalog",
]);
export type Scope = { bindings: Set<string>; calls: Map<string, string>; modules: Set<string>; roots: Set<ts.Node> };
const moduleCalls = new Set(["moduleIndex"]);
const componentCalls = new Set(Object.keys(Components));

export function declarationExpression(node: ts.Expression, scope: Scope, allowModule = false, composition = false): void {
  const check = (value: ts.Expression, module = false, root = false) => declarationExpression(value, scope, module, root);
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
    || [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword].includes(node.kind)) return;
  if (ts.isIdentifier(node)) {
    if (!scope.bindings.has(node.text)) throw new Error(`PRODUCT_UNKNOWN_BINDING: ${node.text}`);
    if (scope.modules.has(node.text) && !allowModule) throw new Error("MODULE_MANIFEST_ACCESS");
    return;
  }
  if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
    if (!ts.isTypeReferenceNode(node.type) || !ts.isIdentifier(node.type.typeName) || node.type.typeName.text !== "const") {
      throw new Error("PRODUCT_TYPE_ASSERTION_NOT_ALLOWED");
    }
    check(node.expression, allowModule, composition); return;
  }
  if (ts.isParenthesizedExpression(node) || ts.isSatisfiesExpression(node)
    || ts.isNonNullExpression(node)) { check(node.expression, allowModule, composition); return; }
  if (ts.isPrefixUnaryExpression(node) && [ts.SyntaxKind.PlusToken, ts.SyntaxKind.MinusToken].includes(node.operator)
    && ts.isNumericLiteral(node.operand)) return;
  if (ts.isArrayLiteralExpression(node)) {
    for (const value of node.elements) check(ts.isSpreadElement(value) ? value.expression : value, allowModule);
    return;
  }
  if (ts.isObjectLiteralExpression(node)) {
    for (const prop of node.properties) {
      if (ts.isSpreadAssignment(prop)) check(prop.expression);
      else if (ts.isShorthandPropertyAssignment(prop) && !prop.objectAssignmentInitializer) check(prop.name);
      else if (ts.isPropertyAssignment(prop) && !ts.isComputedPropertyName(prop.name)) {
        if (["__proto__", "constructor", "prototype"].includes(prop.name.getText().replaceAll(/["']/g, ""))) {
          throw new Error("PRODUCT_EXPRESSION_NOT_ALLOWED");
        }
        check(prop.initializer, composition && prop.name.getText().replaceAll(/["']/g, "") === "modules");
      } else throw new Error("PRODUCT_EXPRESSION_NOT_ALLOWED");
    }
    return;
  }
  if (ts.isPropertyAccessExpression(node)) {
    if (["constructor", "prototype", "__proto__"].includes(node.name.text) || node.questionDotToken) {
      throw new Error("PRODUCT_EXPRESSION_NOT_ALLOWED");
    }
    check(node.expression); return;
  }
  if (ts.isCallExpression(node)) {
    const target = node.expression;
    if (ts.isPropertyAccessExpression(target) && ts.isIdentifier(target.expression)
      && scope.calls.get(target.expression.text) === "Components") {
      if (!componentCalls.has(target.name.text) || target.questionDotToken || node.questionDotToken) throw new Error("PRODUCT_CALL_NOT_ALLOWED");
      if (node.typeArguments?.length) throw new Error("PRODUCT_TYPE_ARGUMENTS_NOT_ALLOWED");
      node.arguments.forEach(argument => check(argument));
      return;
    }
    const name = ts.isIdentifier(node.expression) ? scope.calls.get(node.expression.text) : undefined;
    if (!name || !authoringCalls.has(name) || node.questionDotToken) throw new Error("PRODUCT_CALL_NOT_ALLOWED");
    if (node.typeArguments?.length) throw new Error("PRODUCT_TYPE_ARGUMENTS_NOT_ALLOWED");
    if (["composeProduct", "defineModule"].includes(name) && !scope.roots.has(node)) throw new Error("PRODUCT_ROOT_REQUIRED");
    node.arguments.forEach((argument, index) => check(argument, index === 0 && moduleCalls.has(name), name === "composeProduct"));
    return;
  }
  throw new Error(`PRODUCT_EXPRESSION_NOT_ALLOWED: ${ts.SyntaxKind[node.kind]}`);
}
```
