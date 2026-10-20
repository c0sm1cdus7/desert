# Real DESERT API and runtime grammar

Generated from this bundle's source. Do not edit this snapshot.
Regenerate with npm run authoring:generate; npm run authoring:check detects drift.
Paths below are relative to the SDK root. Read imports/types together; these are
verbatim modules, not standalone snippets or a published package API.

- src/index.ts
- src/contracts.ts
- src/compile.ts
- src/commands.ts
- src/journeys.ts
- src/surfaces.ts
- src/authoring-types.ts
- src/distributions.ts
- src/dependencies.ts
- src/bindings.ts
- src/interaction/catalog.ts
- src/interaction/input-mask.ts
- src/program-grammar.ts
- src/validation.ts
- src/local.ts
- src/local/controller.ts
- src/local/session.ts
- src/local/identity.ts
- src/web/build.ts

## src/index.ts

Source SHA-256: 5b3f2d7e95e66f46366e507d8be2f5c7c40f558ece8557c5ec04b12292a2449b

```ts
export { objectType, product, text, integer, enumeration, principal } from "./contracts.ts";
export type { FieldDefinition, ObjectDefinition, ProductDefinition } from "./contracts.ts";
export { compile } from "./compile.ts";
export { createCommand, updateCommand, fromInput, literal, actorId } from "./commands.ts";
export { mutationJourney, readJourney, ownershipPolicy } from "./journeys.ts";
export { humanSurface, agentSurface } from "./surfaces.ts";
export type { FactsOf, InputOf } from "./authoring-types.ts";
export { clientDistribution, controllerDistribution } from "./distributions.ts";
export { controllerRole, capability } from "./dependencies.ts";
export { localBinding, remoteBinding } from "./bindings.ts";
export { InteractionCatalog } from "./interaction/catalog.ts";
export type { PrimitiveId, InputPrimitive, RendererBank } from "./interaction/catalog.ts";
export { inputMask, InputMaskSchema } from "./interaction/input-mask.ts";
export type { InputMask } from "./interaction/input-mask.ts";
```

## src/contracts.ts

Source SHA-256: e10db849a0fefb841e577ac961d542440613696494c39e31cdd99301beb854e7

```ts
import { Type, type Static } from "@sinclair/typebox";
import { JourneySchema, PolicySchema, SurfaceSchema } from "./program-grammar.ts";
import { DependencySchema } from "./dependencies.ts";

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
const EnumField = Type.Object({ kind: Type.Literal("enum"), values: Type.Array(Type.String({ minLength: 1 }), {
  minItems: 1, uniqueItems: true,
}) }, { additionalProperties: false });
const Field = Type.Union([TextField, IntegerField, PrincipalField, EnumField]);
const ObjectDefinition = Type.Object({
  id: Type.String({ minLength: 1 }),
  facts: Type.Record(Type.String({ minLength: 1 }), Field, { minProperties: 1, additionalProperties: false }),
}, { additionalProperties: false });

export const ProductDefinitionSchema = Type.Object({
  id: Type.String({ minLength: 1 }),
  objects: Type.Array(ObjectDefinition, { minItems: 1 }),
  policies: Type.Optional(Type.Array(PolicySchema)),
  journeys: Type.Optional(Type.Array(JourneySchema)),
  surfaces: Type.Optional(Type.Array(SurfaceSchema)),
  dependencies: Type.Optional(Type.Array(DependencySchema)),
}, { additionalProperties: false });

export type FieldDefinition = Static<typeof Field>;
export type ObjectDefinition = Static<typeof ObjectDefinition>;
export type ProductDefinition = Static<typeof ProductDefinitionSchema>;

export function text(options: Omit<Static<typeof TextField>, "kind"> = {}): Static<typeof TextField> {
  return { ...options, kind: "text" };
}

export function integer(options: Omit<Static<typeof IntegerField>, "kind"> = {}): Static<typeof IntegerField> {
  return { ...options, kind: "integer" };
}

export function principal(): Static<typeof PrincipalField> { return { kind: "principal" }; }
export function enumeration<const V extends [string, ...string[]]>(values: V) {
  return { kind: "enum" as const, values };
}
export function objectType<const O extends ObjectDefinition>(definition: O): O { return definition; }
export function product<const P extends ProductDefinition>(definition: P): P { return definition; }
```

## src/compile.ts

Source SHA-256: ae811b137ae512c862b1079bca8547113c3338c6b1d93795c7a95ccfc3a102cf

```ts
import { createHash } from "node:crypto";
import { ProductDefinitionSchema, type ProductDefinition } from "./contracts.ts";
import { freezeDeep, jsonSnapshot } from "./json.ts";
import { emitObject } from "./schema.ts";
import { createSchemaValidator, createShapeValidator } from "./validation.ts";
import { compileProgram } from "./compile-program.ts";
import { projectSurface } from "./project-surface.ts";
import { requireReference } from "./references.ts";
import { planDistributions } from "./plan-distributions.ts";
import { rememberDefinition } from "./compiled-definition.ts";

const validateDefinition = createSchemaValidator<ProductDefinition>(ProductDefinitionSchema);

export function compile(definition: unknown) {
  const snapshot = jsonSnapshot(definition);
  if (!validateDefinition(snapshot)) throw new Error("Invalid definition: unsupported or malformed contract");
  const objects = new Map(snapshot.objects.map(object => [object.id, object]));
  if (objects.size !== snapshot.objects.length) throw new Error("Invalid definition: duplicate object identity");
  const compiled = new Map([...objects].map(([id, object]) => {
    const schema = freezeDeep(emitObject(object));
    return [id, { schema, validate: createShapeValidator(schema) }] as const;
  }));
  const program = compileProgram(snapshot);
  const inputs = new Map([...program.commands].map(([id, command]) => {
    const schema = freezeDeep(command.inputSchema);
    return [id, { schema, validate: createShapeValidator(schema) }] as const;
  }));
  const digest = createHash("sha256")
    .update(JSON.stringify({ format: snapshot.journeys ? "desert.contract/3" : "desert.shape/1", definition: snapshot }))
    .digest("hex");
  const description = freezeDeep({
    protocol: "desert.shapes/1" as const,
    productId: snapshot.id,
    contractDigest: digest,
    objects: Object.fromEntries([...compiled].map(([id, object]) => [id, object.schema])),
  });
  const surfaces = new Map([...program.surfaces].map(([id, surface]) => [id, projectSurface(snapshot, program, surface, digest)]));
  const executionPlan = freezeDeep({ status: "not-installed" as const,
    policies: snapshot.policies ?? [], journeys: snapshot.journeys ?? [], dependencies: snapshot.dependencies ?? [] });

  function resolve(id: string) {
    const object = compiled.get(id);
    if (!object) throw new Error(`Unknown object: ${id}`);
    return object;
  }

  const application = Object.freeze({
    id: snapshot.id,
    digest,
    objectIds: Object.freeze([...objects.keys()]),
    describe() { return description; },
    executionPlan() { return executionPlan; },
    planDistributions(definitions: unknown) { return planDistributions(snapshot.id, digest, surfaces, program.dependencies, definitions); },
    surface(id: string) { return requireReference(surfaces, id, "surface"); },
    inputSchema(id: string) { return requireReference(inputs, id, "command").schema; },
    validateInput(id: string, value: unknown) { return requireReference(inputs, id, "command").validate(value); },
    schema(id: string) { return resolve(id).schema; },
    validate(id: string, value: unknown) {
      return resolve(id).validate(value);
    },
  });
  rememberDefinition(application, snapshot);
  return application;
}
```

## src/commands.ts

Source SHA-256: ef8c47458c7ef6a30a02573d5cd56930b6ab22d605f104608543a65bfab71a68

```ts
import type { ObjectDefinition } from "./contracts.ts";
import type { ChangeValues, Conditions, CreateValues, WritableKey } from "./authoring-types.ts";

export function fromInput<const K extends string>(field: K) { return { kind: "input" as const, field }; }
export function literal<const V extends string | number>(value: V) { return { kind: "literal" as const, value }; }
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

Source SHA-256: bd1ad8d4dec1443d3889f4e88cdf11948e45e0a11324bce27bd29625ffc764f4

```ts
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
```

## src/surfaces.ts

Source SHA-256: 2c5d826ced9becfcaab802f015dc5c950aeb656b4929024b4b5e709bbed709bc

```ts
import type { JourneyDefinition, SurfaceDefinition } from "./program-grammar.ts";
import type { InputPrimitive } from "./interaction/catalog.ts";

type Human = Extract<SurfaceDefinition, { kind: "human" }>;
type Read = Extract<JourneyDefinition, { kind: "read" }>;
type Mutation = Extract<JourneyDefinition, { kind: "mutation" }>;
type Create = Mutation & { command: { kind: "create" } };
type Update = Mutation & { command: { kind: "update" } };
type InputKey<J> = J extends Mutation ? `${J["command"]["object"]}.${J["command"]["input"][number]}` : never;

export function humanSurface<const Id extends string, const J extends JourneyDefinition[]>(definition: {
  id: Id, journeys: J, entry: Extract<J[number], Read>, primaryAction: Extract<J[number], Create>,
  subjectActions: Extract<J[number], Update>[], connection: Human["connection"],
  inputs?: Partial<Record<NoInfer<InputKey<J[number]>>, InputPrimitive>>,
  commit: Record<NoInfer<Extract<J[number], Mutation>["id"]>, "submit" | "review">,
  language: Omit<Human["language"], "journeys"> & { journeys: Record<NoInfer<J[number]["id"]>, string> },
}) {
  return { ...definition, kind: "human" as const, journeys: definition.journeys.map(journey => journey.id),
    entry: definition.entry.id, primaryAction: definition.primaryAction.id,
    subjectActions: definition.subjectActions.map(journey => journey.id) };
}

export function agentSurface<const Id extends string>(id: Id, journeys: JourneyDefinition[]) {
  return { id, kind: "agent" as const, journeys: journeys.map(journey => journey.id) };
}
```

## src/authoring-types.ts

Source SHA-256: ad2758763325ac72688982b8bf5a1229adfb596055aa4db7f4da895e1b17334d

```ts
import type { FieldDefinition, ObjectDefinition } from "./contracts.ts";

export type FieldValue<F extends FieldDefinition> = F extends { kind: "integer" } ? number
  : F extends { kind: "enum", values: (infer V)[] } ? V : string;
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
    : { kind: "literal", value: FieldValue<F> } | CompatibleInput<O, Keys, F>;
export type CreateValues<O extends ObjectDefinition, Keys extends FieldKey<O>> = {
  [K in FieldKey<O>]: Assignment<O, Keys, O["facts"][K]>;
};
export type ChangeValues<O extends ObjectDefinition, Keys extends FieldKey<O>> = {
  [K in WritableKey<O>]?: Assignment<O, Keys, O["facts"][K]>;
};
export type Conditions<O extends ObjectDefinition> = Partial<FactsOf<O>>;
export type InputOf<O extends ObjectDefinition, C extends { object: O["id"], input: WritableKey<O>[] }> =
  Pick<FactsOf<O>, C["input"][number]>;
```

## src/distributions.ts

Source SHA-256: a4e5ff6d361a4a43f660a9b48b62d6c6d6180d981efe1a9b883ada04b9dee544

```ts
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

Source SHA-256: 2866c93cd1d79f1995f05a1df25a9370237f9f41dae5b16cfe86b1f43141b015

```ts
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
```

## src/interaction/catalog.ts

Source SHA-256: 9892a6e7c36fed79838a2eede72419d692e8b2044675cc7c1fd6c285ef393f30

```ts
import { freezeDeep, jsonSnapshot } from "../json.ts";
import { ControlBank } from "./control-bank.ts";
import { CatalogGroups, CatalogFoundations, catalogInspection, type DiscoveryGroup, type FoundationId } from "./catalog-ownership.ts";

function entry<const Id extends string, const Family extends string, const States extends readonly string[]>(
  id: Id, family: Family, states: States, group: DiscoveryGroup, owners: readonly FoundationId[]) {
  return { id, family, states, inspection: catalogInspection(id, states, group, owners,
    ['tests/bank-node.test.ts', 'tests/public-catalog-bank.test.ts']) };
}

export const InteractionCatalog = freezeDeep({
  id: "desert.human-interaction", version: "0.4.1",
  groups: CatalogGroups, foundations: CatalogFoundations,
  entries: [
    entry("input.text", "primitive", ["empty", "value", "invalid", "disabled"], "controls", ["pane", "well"]),
    entry("input.multiline", "primitive", ["empty", "value", "invalid", "disabled"], "controls", ["pane", "well"]),
    entry("fact", "primitive", ["known", "empty", "unknown"], "foundations", ["stack", "status"]),
    entry("action", "primitive", ["ready", "unavailable", "pending"], "foundations", ["pane", "action"]),
    entry("availability", "primitive", ["unknown", "ready", "unavailable"], "foundations", ["status"]),
    entry("collection", "composition", ["empty", "records"], "compositions", ["stack", "pane", "action"]),
    entry("form", "composition", ["incomplete", "ready", "disconnected"], "compositions", ["stack", "well", "action"]),
    entry("context", "composition", ["available", "unavailable"], "compositions", ["stack", "action"]),
    entry("review", "composition", ["prepared", "uncertain"], "compositions", ["stack", "status", "action"]),
    entry("transient", "composition", ["open", "locked"], "compositions", ["pane", "stack", "action"]),
    entry("problem", "composition", ["error", "warning"], "compositions", ["pane", "status", "action"]),
    entry("catalog.card", "composition", ["featured", "item"], "product", ["stack", "action"]),
    entry("catalog.home", "composition", ["populated"], "product", ["stack"]),
    entry("catalog.detail", "composition", ["reading"], "product", ["stack"]),
    ...ControlBank.map(({ id, family, specimens, inspection }) => ({ id, family, states: specimens.map(specimen => specimen.state), inspection })),
  ] as const,
});

export type PrimitiveId = typeof InteractionCatalog.entries[number]["id"];
export type InputPrimitive = Extract<PrimitiveId, `input.${string}`>;
export type RendererBank<T> = { readonly [K in PrimitiveId]: T };

export function requireCatalog(candidate: unknown) {
  if (JSON.stringify(jsonSnapshot(candidate)) !== JSON.stringify(jsonSnapshot(InteractionCatalog))) {
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

## src/program-grammar.ts

Source SHA-256: 0838b5ec59d467061bf83c6f28097f389e057c90e6e22f9285c95edd3affb69d

```ts
import { Type, type Static } from "@sinclair/typebox";
import { RequirementsSchema } from "./dependencies.ts";
import { InputPrimitiveSchema } from "./interaction/grammar.ts";

const closed = { additionalProperties: false };
const Name = Type.String({ minLength: 1 });
const Names = Type.Array(Name, { uniqueItems: true });
const Scalar = Type.Union([Type.String(), Type.Integer({ minimum: Number.MIN_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER })]);
const Expression = Type.Union([
  Type.Object({ kind: Type.Literal("input"), field: Name }, closed),
  Type.Object({ kind: Type.Literal("actor") }, closed),
  Type.Object({ kind: Type.Literal("literal"), value: Scalar }, closed),
]);
const Assignments = Type.Record(Name, Expression, { minProperties: 1, ...closed });
const Base = { id: Name, object: Name, input: Names };
export const CommandSchema = Type.Union([
  Type.Object({ ...Base, kind: Type.Literal("create"), values: Assignments }, closed),
  Type.Object({ ...Base, kind: Type.Literal("update"), when: Type.Record(Name, Scalar, { minProperties: 1, ...closed }), set: Assignments }, closed),
]);
export const JourneySchema = Type.Union([
  Type.Object({ id: Name, kind: Type.Literal("mutation"), command: CommandSchema, requires: RequirementsSchema,
    confirmation: Type.Literal("prepared-effect"), outcome: Type.Literal("receipt") }, closed),
  Type.Object({ id: Name, kind: Type.Literal("read"), object: Name, requires: RequirementsSchema,
    fields: Type.Array(Name, { minItems: 1, uniqueItems: true }),
    collection: Type.Array(Name, { minItems: 1, uniqueItems: true }) }, closed),
]);
export const PolicySchema = Type.Object({ kind: Type.Literal("ownership"), object: Name, field: Name }, closed);
const SurfaceBase = { id: Name, journeys: Type.Array(Name, { minItems: 1, uniqueItems: true }) };
export const SurfaceSchema = Type.Union([
  Type.Object({ ...SurfaceBase, kind: Type.Literal("agent") }, closed),
  Type.Object({ ...SurfaceBase, kind: Type.Literal("human"), entry: Name, primaryAction: Name, subjectActions: Names,
    inputs: Type.Optional(Type.Record(Name, InputPrimitiveSchema, closed)),
    commit: Type.Record(Name, Type.Union([Type.Literal("submit"), Type.Literal("review")]), closed),
    language: Type.Object({ locale: Name, fields: Type.Record(Name, Name, closed), journeys: Type.Record(Name, Name, closed) }, closed),
    connection: Type.Object({ availability: Type.Literal("journey-dependencies"), draftRetention: Type.Literal("session-memory"),
      reconnect: Type.Literal("refresh-without-replay") }, closed),
  }, closed),
]);

export type CommandDefinition = Static<typeof CommandSchema>;
export type JourneyDefinition = Static<typeof JourneySchema>;
export type SurfaceDefinition = Static<typeof SurfaceSchema>;
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

Source SHA-256: a91eb1f35b9c5a6b3fde980bb762a6df28690aa2c898a9e182a49bac3a516dc1

```ts
export { openLocalController } from "./local/controller.ts";
export type { LocalDatabase } from "./local/database.ts";
export type { LocalSession } from "./local/session.ts";
export type { LocalAvailabilityOptions } from "./local/availability.ts";
```

## src/local/controller.ts

Source SHA-256: 0b6c5547a28aef1b8b3aa102e89dc320edb9cadab3dc8d564af4d1ba07a6314b

```ts
import { localDatabase, type LocalDatabase } from "./database.ts";
import { localProgram, type Application } from "./program.ts";
import { identityAdministration } from "./identity.ts";
import { localSession } from "./session.ts";

export async function openLocalController(application: Application, options: LocalDatabase & {
  role: string, runLifetimeMs?: number,
}) {
  const program = localProgram(application, options.role);
  const lifetime = options.runLifetimeMs ?? 5 * 60 * 1000;
  if (!Number.isSafeInteger(lifetime) || lifetime <= 0 || lifetime > 86400000) throw new Error("INVALID_RUN_LIFETIME");
  const database = localDatabase(options);
  try { await database.install(application.id, application.digest, options.role); }
  catch (error) { await database.close(); throw error; }
  return Object.freeze({
    status: "local-executor" as const,
    productId: application.id,
    contractDigest: application.digest,
    identities: identityAdministration(database),
    connect(token: string, surface: string) { return localSession(database, program, token, surface, lifetime); },
    close: database.close,
  });
}
```

## src/local/session.ts

Source SHA-256: 14aad4401461750325fa0125842eac4cfdee72f072c2069e4c8af9d50e30fe11

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

export function localSession(database: Database, program: LocalProgram, token: string, surface: string, lifetime: number) {
  database.assertOpen();
  program.application.surface(surface);
  const transact = <T>(operation: (client: PoolClient, actor: string) => Promise<T>) =>
    database.transaction(async client => {
      await requireInstallation(client, { product: program.application.id, digest: program.application.digest, role: program.role });
      const result = await operation(client, await authenticate(client, token));
      await authenticate(client, token);
      return result;
    });
  const session = Object.freeze({
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
    async prepare(runId: string, input: unknown) {
      const snapshot = jsonSnapshot(input);
      return transact((client, actor) => prepareMutation(client, program, actor, surface, runId, snapshot));
    },
    accept(intentId: string, confirmationDigest: string) {
      return transact((client, actor) => acceptMutation(client, program, actor, surface, intentId, confirmationDigest));
    },
    receipt(intentId: string) {
      return transact((client, actor) => recoverReceipt(client, program, actor, surface, intentId));
    },
  });
  rememberSession(session, { application: program.application, surface, role: program.role });
  return session;
}
export type LocalSession = ReturnType<typeof localSession>;
```

## src/local/identity.ts

Source SHA-256: 96504562f3fe441363df03785cae20324844b23714539f1fcdb9f566da888234

```ts
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { Database } from "./database.ts";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function authenticate(client: PoolClient, token: string, lock = true): Promise<string> {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("UNAUTHENTICATED");
  const { rows: [identity] } = await client.query(
    `SELECT id, revoked, expires_at FROM desert_identities WHERE credential_hash = $1${lock ? " FOR SHARE" : ""}`, [hash(token)]);
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

Source SHA-256: 590b6c38f53fbe318317ea6d050c1e3f2c96392787a39bc620bb04efe3b37f60

```ts
import { Ajv } from "ajv";
import standaloneModule from "ajv/dist/standalone/index.js";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import type { compile } from "../compile.ts";
import { requireCatalog } from "../interaction/catalog.ts";
import { deriveForm } from "../interaction/form.ts";

export async function buildHumanModule(application: ReturnType<typeof compile>, surfaceId: string) {
  const surface = application.surface(surfaceId);
  if (surface.kind !== "human") throw new Error("HUMAN_SURFACE_REQUIRED");
  requireCatalog(surface.catalog);
  if (surface.language?.locale !== "en") throw new Error("UNSUPPORTED_RENDERER_LANGUAGE");
  const entry = surface.journeys.find(journey => journey.id === surface.navigation?.entry);
  if (entry?.kind !== "read") throw new Error("UNSUPPORTED_RENDERER_ENTRY");
  const navigation = new Set([surface.navigation!.entry, surface.navigation!.primaryAction, ...surface.navigation!.subjectActions]);
  for (const journey of surface.journeys) {
    if (!navigation.has(journey.id) || (journey.kind === "mutation" &&
        (journey.object !== entry.subject || (journey.subject && journey.inputFields.length)))) {
      throw new Error("UNSUPPORTED_RENDERER_COMPOSITION");
    }
  }
  const engine = new Ajv({ strict: true, allErrors: true, ownProperties: true,
    coerceTypes: false, removeAdditional: false, useDefaults: false, code: { source: true, esm: true } });
  const exports: Record<string, string> = {};
  const commands = new Map<string, string>();
  for (const journey of surface.journeys) {
    if (journey.kind !== "mutation" || commands.has(journey.commandId)) continue;
    deriveForm(journey, surface.inputs ?? {});
    const name = `validate${commands.size}`;
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
