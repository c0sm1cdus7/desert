# Experimental public catalogs and portable renderer contracts

Generated from this bundle's source. Do not edit this snapshot.
Regenerate with npm run authoring:generate; npm run authoring:check detects drift.
Paths below are relative to the SDK root. Read imports/types together; these are
verbatim modules, not standalone snippets or a published package API.

- products/landmarks/product.ts
- products/landmarks/exercises.ts
- products/landmarks/reference.ts
- products/landmarks/build-web.ts
- products/landmarks/run-web.ts
- src/public-catalog/index.ts
- src/public-catalog/authoring.ts
- src/public-catalog/schema.ts
- src/public-catalog/validate-definition.ts
- src/public-catalog/compile.ts
- src/public-catalog/surface.ts
- src/public-catalog/node-schema.ts
- src/public-catalog/events.ts
- src/public-catalog/reducer.ts
- src/public-catalog/project.ts
- src/public-catalog/exercises.ts
- src/public-catalog/draft.ts
- src/public-catalog/capabilities.ts
- src/public-catalog/protocol.ts
- src/public-catalog/client.ts
- src/build/public-catalog/build.ts
- src/build/public-catalog/manifest.ts
- src/build/public-catalog/assets.ts
- src/build/public-catalog/serve.ts
- src/build/public-catalog/renditions.ts
- src/svelte/pieces/media/source.ts
- src/svelte/pieces/media/Image.svelte
- src/svelte/pieces/media/PhotoCollection.svelte
- src/svelte/pieces/media/Viewer.svelte
- src/svelte/pieces/media/gestures.ts
- src/svelte/explorer/PublicCatalogProduct.svelte
- src/svelte/explorer/LocalExercises.svelte
- src/svelte/explorer/CatalogCard.svelte
- src/svelte/explorer/CatalogToolbar.svelte
- src/svelte/explorer/PublicCatalogBank.svelte
- src/svelte/explorer/PublicCatalogBank-model.ts

## products/landmarks/product.ts

Source SHA-256: 4b12fcf4f6e056af007bac1c798a9050163f9cdacbbb2eeaafd4272dc238d92d

```ts
import { objectType, text, enumeration } from "../../src/index.ts";
import { compilePublicCatalog, type PublicCatalogDefinition } from "../../src/public-catalog/index.ts";
import { loadAppleReference } from "./reference.ts";
import { travelKit } from "./exercises.ts";

const continents = ["Asia", "Africa", "Antarctica", "Australia/Oceania", "Europe", "North America", "South America"] as const;
export const Landmark = objectType({
  id: "landmark",
  facts: { title: text({ minLength: 1 }), description: text({ minLength: 1 }), continent: enumeration([...continents]) },
});

/** Author declares public data and its meaning. No Svelte, CSS, callbacks, or controller impersonation. */
export function landmarksDefinition(source: ReturnType<typeof loadAppleReference>["source"]): PublicCatalogDefinition {
  return {
    protocol: "desert.public-catalog/1", id: "landmarks", title: "Landmarks", object: Landmark, source, exercises: travelKit,
    description: "Explore remarkable places around the world.",
    featuredMedia: { kind:'gallery', images:[
      { asset:'place-1016', alt:'Mount Fuji' }, { asset:'place-1019', alt:'Great Barrier Reef' },
      { asset:'place-1001', alt:'Sahara Desert' },
    ] },
    view: {
      title: "title", description: "description",
      home: {
        featured: { record: "1016", eyebrow: "Featured Landmark", actionLabel: "Learn More" },
        groups: { field: "continent", entries: continents.map(value => ({ value, title: value })) },
      },
      search: { fields: ["title", "description", "continent"] },
    },
  };
}

export function loadLandmarks() {
  const { source, sourceRoot } = loadAppleReference();
  return { application: compilePublicCatalog(landmarksDefinition(source)), sourceRoot };
}
```

## products/landmarks/exercises.ts

Source SHA-256: 5ffa933a2adffc1c7cce39d1f977dd5aeeb30cf35bb3c0b3b2fca54215f5f51c

```ts
import { controlBankNode } from "../../src/interaction/bank-node.ts";
import { stackNode } from "../../src/interaction/place.ts";
import type { PublicCatalogExercises } from "../../src/public-catalog/exercises.ts";

const base = { version: "desert.control/1", disabled: false } as const;
const option = (value: string, label: string) => ({ value, label, disabled: false });

/** Product declares meanings and values; the shared bank owns every control and transient surface. */
export const travelKit: PublicCatalogExercises = {
  title: "Travel kit",
  subtitle: "Plan your next visit. Your draft stays in this tab.",
  stacks: [
    { id: "visit", title: "Your next visit", description: "Give your idea a name and choose where to go.", items: [
      stackNode({ version: "desert.bank-node/1", kind: "input.text", name: "trip-name", label: "Trip name", value: "", required: true, disabled: false }),
      controlBankNode({ ...base, kind: "select", id: "destination", label: "Destination", required: true, value: null,
        options: [option("1016", "Mount Fuji"), option("1017", "Wulingyuan"), option("1018", "Mount Everest")] }),
      controlBankNode({ ...base, kind: "date", id: "arrival", label: "Arrival date", required: false, value: null }),
    ] },
    { id: "notes", title: "Notes", items: [
      stackNode({ version: "desert.bank-node/1", kind: "input.multiline", name: "notes", label: "Things to remember", value: "", required: false, disabled: false }),
    ] },
    { id: "pace", title: "Travel pace", items: [
      controlBankNode({ ...base, kind: "options", id: "pace", label: "Travel pace", minSelected: 1, maxSelected: 1, selected: ["slow"],
        options: [option("slow", "Take it slowly"), option("active", "Keep exploring")] }),
    ] },
    { id: "interests", title: "Interests", items: [
      controlBankNode({ ...base, kind: "options", id: "activities", label: "Interests", minSelected: 0, maxSelected: 3, selected: [],
        options: [option("walking", "Walking"), option("photography", "Photography"), option("culture", "Culture")] }),
    ] },
    { id: "budget", title: "Budget", items: [
      controlBankNode({ ...base, kind: "money", id: "budget", label: "Estimated budget", required: false,
        currencies: [{ code: "USD", scale: 2 }, { code: "ARS", scale: 2 }, { code: "JPY", scale: 0 }], currency: "USD", minorUnits: null }),
    ] },
    { id: "essentials", title: "Travel documents", description: "Files stay on this device. Nothing is uploaded.", items: [
      controlBankNode({ ...base, kind: "files", id: "documents", label: "Travel documents", files: [],
        limits: { maxCount: 3, maxFileBytes: 5242880, maxTotalBytes: 10485760, accept: ["application/pdf", "image/*", "text/plain"] } }),
    ] },
    { id: "draft", title: "About this draft", items: [
      stackNode({ version: "desert.bank-node/1", kind: "fact", details: {
        kind: "facts", object: "draft", fields: ["storage"], labels: { "draft.storage": "Only in this tab" },
        facts: { storage: "Nothing is booked, uploaded or saved to an account. Closing or reloading this tab discards the draft and local file references." }, multiline: ["storage"],
      } }),
    ] },
    { id: "inspiration", title: "A little inspiration", description: "A sample destination to explore, separate from your travel draft.", items: [
      stackNode({ version: "desert.bank-node/1", kind: "catalog.card", presentation: "featured", record: "1016",
        title: "Mount Fuji", eyebrow: "Featured Landmark", actionLabel: "Learn More",
        image: { asset: "thumb-1016", alt: "Mount Fuji framed by cherry blossoms" } }),
      stackNode({ version: "desert.bank-node/1", kind: "fact", details: { kind: "facts", object: "reference", fields: ["region", "source"],
        labels: { "reference.region": "Region", "reference.source": "Source" }, facts: { region: "Asia", source: "Apple Landmarks sample" } } }),
    ] },
  ],
};
```

## products/landmarks/reference.ts

Source SHA-256: abcb516f81186c7c3da3219f60f60ec25b8df59367f29393f5c9e932afd71ae0

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

export const appleReferenceDirectory = fileURLToPath(new URL(
  "../../../references/apple-landmarks-2026-10-15/source/Landmarks/Landmarks/", import.meta.url));

/** Import trusted sample data at build time. No photographs are copied into the SDK or build. */
export function loadAppleReference(directory = appleReferenceDirectory) {
  const model = readFileSync(join(directory, "Model/LandmarkData.swift"), "utf8");
  const stringsSource = readFileSync(join(directory, "Resources/LandmarkData.xcstrings"), "utf8");
  const strings = JSON.parse(stringsSource).strings as Record<string, {
    localizations: { en: { stringUnit: { value: string } } };
  }>;
  const records = [...model.matchAll(/id: (\d+),\s+name: \.LandmarkData\.([\p{L}]+)Name,\s+continent: "([^"]+)"/gu)]
    .map(([, id, name, continent]) => {
      if (!id || !name || !continent) throw new Error("APPLE_SAMPLE_RECORD_INVALID");
      const key = name.replace(/([a-zçó])([A-Z])/g, "$1_$2").toUpperCase();
      const title = strings[`${key}_NAME`]?.localizations.en.stringUnit.value;
      const description = strings[`${key}_DESCRIPTION`]?.localizations.en.stringUnit.value;
      if (!title || !description) throw new Error("APPLE_SAMPLE_TRANSLATION_MISSING");
      return { id, facts: { title, description, continent }, image: `place-${id}`, thumbnail: `thumb-${id}` };
    });
  if (records.length !== 21) throw new Error("APPLE_SAMPLE_REVISION_CHANGED");
  return {
    sourceRoot: join(directory, "Resources/Assets.xcassets"),
    source: {
      id: "apple.landmarks.sample", revision: createHash("sha256").update(model).update(stringsSource).digest("hex"),
      records,
      assets: records.flatMap(record => [
        { id: record.image, path: `Landmark backgrounds/${record.id}.imageset/${record.id}@2x.jpg`, alt: record.facts.title },
        { id: record.thumbnail, path: `Landmark thumbnails/${record.id}-thumb.imageset/${record.id}-thumb@2x.jpg`, alt: record.facts.title },
      ]),
    },
  };
}
```

## products/landmarks/build-web.ts

Source SHA-256: 7f9706e4aa43312dcb60969475324275b1c9bd0a5dd6dec3d38fe4565617c2ea

```ts
import { buildPublicCatalogWeb } from "../../src/build/public-catalog/build.ts";
import { loadLandmarks } from "./product.ts";

const { application, sourceRoot } = loadLandmarks();
const outputDirectory = process.argv[2] ?? "build/landmarks-web-v1";
const manifest = await buildPublicCatalogWeb(application, { outputDirectory, sourceRoot });
console.log(JSON.stringify({ outputDirectory, ...manifest, files: Object.keys(manifest.files).length }, null, 2));
```

## products/landmarks/run-web.ts

Source SHA-256: de7818c8930f5626094044f0dbee93da264ed47ac961018721663fc4b12f7ec8

```ts
import { servePublicCatalog } from "../../src/build/public-catalog/serve.ts";
import { loadLandmarks } from "./product.ts";

const { application, sourceRoot } = loadLandmarks();
const server = await servePublicCatalog({ buildDirectory: process.argv[2] ?? "build/landmarks-web-v1",
  sourceRoot, assets: application.assets, port: Number(process.argv[3] ?? 4280) });
console.log(`Landmarks · DESERT web reference: ${server.origin}`);
console.log("Public read-only catalog. Travel kit edits are session drafts. Notebook data is untouched.");
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => { void server.close(); });
```

## src/public-catalog/index.ts

Source SHA-256: d9e70ac74fe828d080b6574becbf3be7cf6bcbbb51f06f7297f07753029c1cc1

```ts
export { compilePublicCatalog, type CompiledPublicCatalog } from "./compile.ts";
export { publicCatalog, type AuthoredPublicCatalog } from "./authoring.ts";
export { projectPublicCatalog, type PublicCatalogProjection } from "./project.ts";
export { reducePublicCatalog, initialPublicCatalogState } from "./reducer.ts";
export { publicCatalogSurface } from "./surface.ts";
export { publicCatalogSchemas } from "./protocol.ts";
export { PublicCatalogRequirements, publicCatalogRequirements, requirePublicCatalogCapabilities, RendererRequirementsSchema, type RendererRequirements } from "./capabilities.ts";
export type { PublicCatalogExercises } from "./exercises.ts";
export type { PublicCatalogDefinition, PublicCatalogSurface, PublicCatalogState, CatalogAsset } from "./schema.ts";
export type { CatalogCardNode, CatalogFeaturedNode, CatalogItemNode, CatalogHomeNode, CatalogDetailNode } from "./node-schema.ts";
export type { CatalogEvent } from "./events.ts";
```

## src/public-catalog/authoring.ts

Source SHA-256: e71dfafbb80fb124f4b7db55b5b1a89a02abe4f893ff3d36338f628a096922d9

```ts
import type { ObjectDefinition } from "../contracts.ts";
import type { FactsOf, FieldKey } from "../authoring-types.ts";
import type { PublicCatalogDefinition } from "./schema.ts";

type KeysOfKind<O extends ObjectDefinition, Kind extends string> = {
  [K in FieldKey<O>]: O["facts"][K]["kind"] extends Kind ? K : never;
}[FieldKey<O>];
type View = PublicCatalogDefinition["view"];
export type AuthoredPublicCatalog<O extends ObjectDefinition> = Omit<PublicCatalogDefinition, "object" | "source" | "view"> & {
  object: O;
  source: Omit<PublicCatalogDefinition["source"], "records"> & {
    records: (Omit<PublicCatalogDefinition["source"]["records"][number], "facts"> & { facts: FactsOf<O> })[];
  };
  view: Omit<View, "title" | "description" | "home" | "search"> & {
    title: KeysOfKind<O, "text">; description: KeysOfKind<O, "text">;
    home: Omit<View["home"], "groups"> & { groups: Omit<View["home"]["groups"], "field"> & { field: KeysOfKind<O, "enum"> } };
    search: { fields: KeysOfKind<O, "text" | "enum">[] };
  };
};

/** Literal-preserving authoring; compilation still validates untrusted input and references. */
export function publicCatalog<const O extends ObjectDefinition>(definition: AuthoredPublicCatalog<O>): AuthoredPublicCatalog<O> {
  return definition;
}
```

## src/public-catalog/schema.ts

Source SHA-256: 5cdfa5c7ea41ca06dd8aa1e9071f84dfb83c82fb5a96f9c6774c8e23f3d7f02e

```ts
import { Type, type Static } from "@sinclair/typebox";
import { ProductDefinitionSchema } from "../contracts.ts";
import type { Frozen } from "../json.ts";
import { CatalogHomeSchema, CatalogDetailSchema, CatalogImageSchema, LogicalIdSchema, closedObject, nonemptyText } from "./node-schema.ts";
import { RendererRequirementsSchema } from "./capabilities.ts";
import { PublicCatalogExercisesSchema } from "./exercises.ts";

export const CatalogAssetSchema = closedObject({ id: LogicalIdSchema, path: nonemptyText(), alt: nonemptyText() });
export const FeaturedMediaSchema = Type.Union([
  closedObject({ kind: Type.Literal('image'), asset: LogicalIdSchema, alt: nonemptyText() }),
  closedObject({ kind: Type.Literal('gallery'), images: Type.Array(CatalogImageSchema, { minItems: 1, maxItems: 10 }) }),
  closedObject({ kind: Type.Literal('video'), asset: LogicalIdSchema, alt: nonemptyText(), poster: Type.Optional(LogicalIdSchema) }),
]);
const record = closedObject({ id: LogicalIdSchema, image: LogicalIdSchema, thumbnail: Type.Optional(LogicalIdSchema),
  gallery: Type.Optional(Type.Array(LogicalIdSchema, { minItems: 1, maxItems: 10, uniqueItems: true })),
  facts: Type.Record(nonemptyText(), Type.Union([Type.String(), Type.Number()]), { additionalProperties: false }) });
export const PublicCatalogDefinitionSchema = closedObject({
  protocol: Type.Literal("desert.public-catalog/1"), id: LogicalIdSchema, title: nonemptyText(), description: nonemptyText(),
  featuredMedia: Type.Optional(FeaturedMediaSchema),
  object: ProductDefinitionSchema.properties.objects.items,
  exercises: Type.Optional(PublicCatalogExercisesSchema),
  source: closedObject({ id: LogicalIdSchema, revision: nonemptyText(),
    assets: Type.Array(CatalogAssetSchema, { minItems: 1 }), records: Type.Array(record, { minItems: 1 }) }),
  view: closedObject({ title: nonemptyText(), description: nonemptyText(),
    home: closedObject({ featured: closedObject({ record: LogicalIdSchema, eyebrow: nonemptyText(), actionLabel: nonemptyText() }),
      groups: closedObject({ field: nonemptyText(), entries: Type.Array(closedObject({
        value: nonemptyText(), title: nonemptyText(),
      }), { minItems: 1 }) }) }),
    search: closedObject({ fields: Type.Array(nonemptyText(), { minItems: 1, uniqueItems: true }) }),
  }),
});
export const PublicCatalogSurfaceSchema = closedObject({
  protocol: Type.Literal("desert.catalog-surface/1"), kind: Type.Literal("human"), mode: Type.Literal("public-catalog"),
  productId: LogicalIdSchema, title: nonemptyText(), description: nonemptyText(), digest: Type.String({ pattern: "^[a-f0-9]{64}$" }),
  featuredMedia: Type.Optional(FeaturedMediaSchema),
  source: closedObject({ id: LogicalIdSchema, revision: nonemptyText() }), requirements: RendererRequirementsSchema,
  exercises: Type.Optional(PublicCatalogExercisesSchema),
  home: CatalogHomeSchema, details: Type.Array(CatalogDetailSchema, { minItems: 1 }),
  search: closedObject({ mode: Type.Literal("all-terms"), documents: Type.Array(closedObject({
    record: LogicalIdSchema, text: Type.String(),
  }), { minItems: 1 }) }),
});
export const PublicCatalogStateSchema = closedObject({ query: Type.String(), selectedId: Type.Union([LogicalIdSchema, Type.Null()]) });
export type PublicCatalogDefinition = Frozen<Static<typeof PublicCatalogDefinitionSchema>>;
export type PublicCatalogSurface = Frozen<Static<typeof PublicCatalogSurfaceSchema>>;
export type PublicCatalogState = Frozen<Static<typeof PublicCatalogStateSchema>>;
export type CatalogAsset = Frozen<Static<typeof CatalogAssetSchema>>;
```

## src/public-catalog/validate-definition.ts

Source SHA-256: 948549e48f07519d049c455c35ee7afb49dfcab81805ea9e09c73a230d131e5f

```ts
import { Check } from "@sinclair/typebox/value";
import { jsonSnapshot } from "../json.ts";
import { emitObject } from "../schema.ts";
import { createShapeValidator } from "../validation.ts";
import { PublicCatalogDefinitionSchema, type PublicCatalogDefinition } from "./schema.ts";
import { checkPublicCatalogExercises } from "./exercises.ts";

function requireUnique(values: readonly string[], label: string) {
  if (new Set(values).size !== values.length) throw new Error(`INVALID_CATALOG_DUPLICATE_${label}`);
}
function checkRelativeAssetPath(path: string) {
  if (/[\\:%?#\x00-\x1f\x7f]/u.test(path) || path.split("/").some(part => !part || part === "." || part === "..")) {
    throw new Error("INVALID_CATALOG_ASSET_PATH");
  }
}

export function validatePublicCatalogDefinition(value: unknown): PublicCatalogDefinition {
  const definition = jsonSnapshot(value);
  if (!Check(PublicCatalogDefinitionSchema, definition)) throw new Error("INVALID_PUBLIC_CATALOG_DEFINITION");
  const { object, source, view } = definition;
  if (Object.values(object.facts).some(fact => fact.kind === "principal")) throw new Error("INVALID_PUBLIC_CATALOG_PRINCIPAL");
  const field = (name: string) => Object.hasOwn(object.facts, name) ? object.facts[name] : undefined;
  if (field(view.title)?.kind !== "text" || field(view.description)?.kind !== "text") throw new Error("INVALID_CATALOG_TEXT_EXPOSURE");
  const group = field(view.home.groups.field);
  if (group?.kind !== "enum") throw new Error("INVALID_CATALOG_GROUP_FIELD");
  const groupValues = view.home.groups.entries.map(entry => entry.value);
  requireUnique(groupValues, "GROUP");
  if (groupValues.length !== group.values.length || groupValues.some(value => !group.values.includes(value))) {
    throw new Error("INVALID_CATALOG_GROUP_COVERAGE");
  }
  const exposed = [view.title, view.description, view.home.groups.field];
  if (view.search.fields.some(name => !exposed.includes(name))) throw new Error("INVALID_CATALOG_SEARCH_EXPOSURE");
  requireUnique(source.assets.map(asset => asset.id), "ASSET");
  requireUnique(source.records.map(record => record.id), "RECORD");
  for (const asset of source.assets) checkRelativeAssetPath(asset.path);
  const assets = new Set(source.assets.map(asset => asset.id));
  const media = definition.featuredMedia;
  if (media?.kind === 'gallery') {
    requireUnique(media.images.map(image => image.asset), 'MEDIA');
    if (media.images.some(image => !assets.has(image.asset))) throw new Error('INVALID_CATALOG_FEATURED_MEDIA_REFERENCE');
  } else if (media && (!assets.has(media.asset) || (media.kind === 'video' && media.poster && !assets.has(media.poster)))) {
    throw new Error('INVALID_CATALOG_FEATURED_MEDIA_REFERENCE');
  }
  if (definition.exercises) checkPublicCatalogExercises(definition.exercises, assets, new Set(source.records.map(record => record.id)));
  const validateFacts = createShapeValidator(emitObject(object));
  for (const record of source.records) {
    if (record.gallery && (record.gallery[0] !== record.image || record.gallery.some(id => !assets.has(id)))) {
      throw new Error('INVALID_CATALOG_GALLERY_REFERENCE');
    }
    if (!validateFacts(record.facts).valid) throw new Error("INVALID_CATALOG_RECORD_FACTS");
    if (!String(record.facts[view.title]).trim()) throw new Error("INVALID_CATALOG_RECORD_TITLE");
    if (!assets.has(record.image) || (record.thumbnail !== undefined && !assets.has(record.thumbnail))) {
      throw new Error("INVALID_CATALOG_ASSET_REFERENCE");
    }
  }
  if (!source.records.some(record => record.id === view.home.featured.record)) throw new Error("INVALID_CATALOG_FEATURED_REFERENCE");
  return definition;
}
```

## src/public-catalog/compile.ts

Source SHA-256: d0dce07f1e41604191f3bff32cd954f10e5d7b08d9a9786b14dee3c21001e001

```ts
import { createHash } from "node:crypto";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { validatePublicCatalogDefinition } from "./validate-definition.ts";
import { publicCatalogRequirements } from "./capabilities.ts";
import { publicCatalogSurface } from "./surface.ts";
import type { CatalogAsset, PublicCatalogSurface } from "./schema.ts";
import type { CatalogItemNode, CatalogFeaturedNode } from "./node-schema.ts";
import { stackNodes } from "../interaction/place.ts";

export type CompiledPublicCatalog = Frozen<{
  id: string; digest: string; surface: PublicCatalogSurface; assets: readonly CatalogAsset[];
}>;

/** Experimental read-only source compiler, deliberately separate from controller-backed journeys. */
export function compilePublicCatalog(input: unknown): CompiledPublicCatalog {
  const definition = validatePublicCatalogDefinition(input);
  const { id, title, source, view } = definition;
  // Host file locations are build bindings, not portable product meaning.
  const portable = { ...definition, source: { ...source, assets: source.assets.map(({ id, alt }) => ({ id, alt })) } };
  const digest = createHash("sha256").update(JSON.stringify(jsonSnapshot(portable))).digest("hex");
  const assets = new Map(source.assets.map(asset => [asset.id, asset]));
  const image = (asset: string) => ({ asset, alt: assets.get(asset)!.alt });
  const details = source.records.map(record => ({ version: "desert.bank-node/1" as const, kind: "catalog.detail" as const,
    record: record.id, title: String(record.facts[view.title]), description: String(record.facts[view.description]), image: image(record.image),
    ...(record.gallery ? { gallery: record.gallery.map(image) } : {}) }));
  const cards = new Map(source.records.map(record => [record.id, {
    version: "desert.bank-node/1", kind: "catalog.card", record: record.id, title: String(record.facts[view.title]),
    image: image(record.thumbnail ?? record.image), presentation: "item",
  } satisfies CatalogItemNode]));
  const featuredRecord = source.records.find(record => record.id === view.home.featured.record)!;
  const featured: CatalogFeaturedNode = { version: "desert.bank-node/1", kind: "catalog.card", record: featuredRecord.id,
    title: String(featuredRecord.facts[view.title]), image: image(featuredRecord.image), presentation: "featured",
    eyebrow: view.home.featured.eyebrow, actionLabel: view.home.featured.actionLabel };
  const surface = publicCatalogSurface({ protocol: "desert.catalog-surface/1", kind: "human", mode: "public-catalog",
    productId: id, title, description: definition.description, digest, source: { id: source.id, revision: source.revision },
    ...(definition.featuredMedia ? { featuredMedia: definition.featuredMedia } : {}),
    requirements: publicCatalogRequirements(definition.exercises?.stacks.flatMap(stack => stackNodes(stack.items)),
      definition.featuredMedia?.kind === 'gallery' || source.records.some(record => Boolean(record.gallery))),
    ...(definition.exercises ? { exercises: definition.exercises } : {}),
    home: { version: "desert.bank-node/1", kind: "catalog.home", featured,
      groups: view.home.groups.entries.map(group => ({ id: group.value, title: group.title,
        items: source.records.filter(record => record.facts[view.home.groups.field] === group.value).map(record => cards.get(record.id)!),
      })) }, details, search: { mode: "all-terms", documents: source.records.map(record => ({ record: record.id,
      text: view.search.fields.map(field => String(record.facts[field])).join("\n"),
    })) },
  });
  return freezeDeep({ id, digest, surface, assets: source.assets });
}
```

## src/public-catalog/surface.ts

Source SHA-256: b52bbcc0501f1b054d4408e2959d952ed2e5927f45d84fc329e21ea115811724

```ts
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot } from "../json.ts";
import { checkCatalogHome } from "./node-schema.ts";
import { publicCatalogRequirements, requirePublicCatalogCapabilities } from "./capabilities.ts";
import { checkPublicCatalogExercises } from "./exercises.ts";
import { stackNodes } from "../interaction/place.ts";
import { PublicCatalogSurfaceSchema, PublicCatalogStateSchema, type PublicCatalogSurface, type PublicCatalogState } from "./schema.ts";

const validated = new WeakSet<object>();
/** Validate the portable boundary again when it arrives from serialized build output. */
export function publicCatalogSurface(value: unknown): PublicCatalogSurface {
  if (typeof value === "object" && value !== null && validated.has(value)) return value as PublicCatalogSurface;
  const surface: unknown = jsonSnapshot(value);
  if (!Check(PublicCatalogSurfaceSchema, surface)) throw new Error("INVALID_PUBLIC_CATALOG_SURFACE");
  checkCatalogHome(surface.home);
  if (surface.exercises) checkPublicCatalogExercises(surface.exercises, undefined, new Set(surface.details.map(detail => detail.record)));
  const requirements = publicCatalogRequirements(surface.exercises?.stacks.flatMap(stack => stackNodes(stack.items)),
    surface.featuredMedia?.kind === 'gallery' || surface.details.some(detail => Boolean(detail.gallery)));
  for (const detail of surface.details) if (detail.gallery) {
    if (detail.gallery[0]?.asset !== detail.image.asset || detail.gallery[0]?.alt !== detail.image.alt ||
      new Set(detail.gallery.map(p => p.asset)).size !== detail.gallery.length) throw new Error('INVALID_CATALOG_GALLERY_REFERENCE');
  }
  if (surface.featuredMedia?.kind === 'gallery' && new Set(surface.featuredMedia.images.map(p => p.asset)).size !== surface.featuredMedia.images.length) {
    throw new Error('INVALID_CATALOG_GALLERY_REFERENCE');
  }
  requirePublicCatalogCapabilities(surface.requirements, requirements);
  for (const category of ["nodes", "events", "features"] as const) {
    if (surface.requirements[category].length !== requirements[category].length) throw new Error("INVALID_CATALOG_REQUIREMENTS");
  }
  const details = new Map(surface.details.map(detail => [detail.record, detail]));
  const cards = surface.home.groups.flatMap(group => group.items);
  const documents = new Map(surface.search.documents.map(document => [document.record, document]));
  if (details.size !== surface.details.length || documents.size !== surface.search.documents.length ||
      details.size !== cards.length || documents.size !== details.size ||
      cards.some(card => !details.has(card.record) || details.get(card.record)?.title !== card.title) ||
      [...documents.keys()].some(record => !details.has(record))) throw new Error("INVALID_CATALOG_SURFACE_REFERENCES");
  const featuredDetail = details.get(surface.home.featured.record);
  if (!featuredDetail || featuredDetail.title !== surface.home.featured.title ||
      featuredDetail.image.asset !== surface.home.featured.image.asset || featuredDetail.image.alt !== surface.home.featured.image.alt) {
    throw new Error("INVALID_CATALOG_FEATURED_REFERENCE");
  }
  const frozen = freezeDeep(surface);
  validated.add(frozen);
  return frozen;
}

export function publicCatalogState(surface: PublicCatalogSurface, value: unknown): PublicCatalogState {
  const state: unknown = jsonSnapshot(value);
  if (!Check(PublicCatalogStateSchema, state)) throw new Error("INVALID_PUBLIC_CATALOG_STATE");
  if (state.selectedId !== null && !surface.details.some(detail => detail.record === state.selectedId)) {
    throw new Error("UNKNOWN_CATALOG_RECORD");
  }
  return freezeDeep(state);
}
```

## src/public-catalog/node-schema.ts

Source SHA-256: a91ec145b9c0fc96f213cb85866ac9ea35dccb06d48a8bd738f8df5514ae3075

```ts
import { Type, type Static, type TProperties } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";

export const closedObject = <P extends TProperties>(properties: P) => Type.Object(properties, { additionalProperties: false });
export const nonemptyText = () => Type.String({ minLength: 1 });
/** Logical identity is not a URL, filesystem path, or platform resource handle. */
export const LogicalIdSchema = Type.String({ pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*$", minLength: 1 });
const node = <K extends string, P extends TProperties>(kind: K, properties: P) => closedObject({
  version: Type.Literal("desert.bank-node/1"), kind: Type.Literal(kind), ...properties,
});
export const CatalogImageSchema = closedObject({ asset: LogicalIdSchema, alt: nonemptyText() });
const card = { record: LogicalIdSchema, title: nonemptyText(), image: CatalogImageSchema };
export const CatalogItemSchema = node("catalog.card", { ...card, presentation: Type.Literal("item") });
export const CatalogFeaturedSchema = node("catalog.card", {
  ...card, presentation: Type.Literal("featured"), eyebrow: nonemptyText(), actionLabel: nonemptyText(),
});
export const CatalogCardSchema = Type.Union([CatalogFeaturedSchema, CatalogItemSchema]);
export const CatalogHomeSchema = node("catalog.home", {
  featured: CatalogFeaturedSchema,
  groups: Type.Array(closedObject({ id: nonemptyText(), title: nonemptyText(), items: Type.Array(CatalogItemSchema) }), { minItems: 1 }),
});
export const CatalogDetailSchema = node("catalog.detail", { ...card, description: Type.String(),
  gallery: Type.Optional(Type.Array(CatalogImageSchema, { minItems: 1, maxItems: 10 })) });
export type CatalogItemNode = Frozen<Static<typeof CatalogItemSchema>>;
export type CatalogFeaturedNode = Frozen<Static<typeof CatalogFeaturedSchema>>;
export type CatalogCardNode = Frozen<Static<typeof CatalogCardSchema>>;
export type CatalogHomeNode = Frozen<Static<typeof CatalogHomeSchema>>;
export type CatalogDetailNode = Frozen<Static<typeof CatalogDetailSchema>>;

/** Home sections form a single ordered catalog partition, never duplicate navigation targets. */
export function checkCatalogHome(node: CatalogHomeNode): void {
  const records = node.groups.flatMap(group => group.items.map(item => item.record));
  if (new Set(node.groups.map(group => group.id)).size !== node.groups.length ||
      new Set(records).size !== records.length || !records.includes(node.featured.record)) {
    throw new Error("INVALID_CATALOG_HOME_REFERENCES");
  }
}
```

## src/public-catalog/events.ts

Source SHA-256: e4a6ea8e1a742fa6690022482678468e08040e5651b04808eb5810b429623b01

```ts
import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { closedObject, LogicalIdSchema } from "./node-schema.ts";

export const CatalogEventSchema = Type.Union([
  closedObject({ kind: Type.Literal("catalog.open"), record: LogicalIdSchema }),
  closedObject({ kind: Type.Literal("catalog.back") }),
  closedObject({ kind: Type.Literal("catalog.search"), query: Type.String() }),
]);
export type CatalogEvent = Frozen<Static<typeof CatalogEventSchema>>;
export function catalogEvent(value: unknown): CatalogEvent {
  const event = jsonSnapshot(value);
  if (!Check(CatalogEventSchema, event)) throw new Error("INVALID_CATALOG_EVENT");
  return freezeDeep(event);
}
```

## src/public-catalog/reducer.ts

Source SHA-256: f4d3643083667c621bead40abdf9bae9f79210a645b6a5b45c82caefff16e024

```ts
import { freezeDeep } from "../json.ts";
import { catalogEvent, type CatalogEvent } from "./events.ts";
import { publicCatalogState, publicCatalogSurface } from "./surface.ts";
import type { PublicCatalogSurface, PublicCatalogState } from "./schema.ts";

export function initialPublicCatalogState(): PublicCatalogState { return freezeDeep({ query: "", selectedId: null }); }

/** Navigation and search only; no favorite, collection mutation, persistence or authority is implied. */
export function reducePublicCatalog(value: PublicCatalogSurface, current: PublicCatalogState, input: CatalogEvent): PublicCatalogState {
  const surface = publicCatalogSurface(value);
  const state = publicCatalogState(surface, current);
  const event = catalogEvent(input);
  switch (event.kind) {
    case "catalog.open": return publicCatalogState(surface, { ...state, selectedId: event.record });
    case "catalog.back": return freezeDeep({ ...state, selectedId: null });
    case "catalog.search": return freezeDeep({ ...state, query: event.query, selectedId: null });
  }
}
```

## src/public-catalog/project.ts

Source SHA-256: b3f2eeb3277058b40876511b5ecf41cbe911500d4cda9214e388b790e29b9e25

```ts
import { freezeDeep } from "../json.ts";
import { publicCatalogState, publicCatalogSurface } from "./surface.ts";
import type { PublicCatalogSurface, PublicCatalogState } from "./schema.ts";
import type { CatalogHomeNode, CatalogDetailNode, CatalogItemNode } from "./node-schema.ts";

export type PublicCatalogProjection = Readonly<{
  content: CatalogHomeNode | CatalogDetailNode; results: readonly CatalogItemNode[]; query: string; selectedId: string | null;
}>;

/** Case-insensitive all-term substring search over declared exposed text, preserving section order. */
export function projectPublicCatalog(value: PublicCatalogSurface, current: PublicCatalogState): PublicCatalogProjection {
  const surface = publicCatalogSurface(value);
  const state = publicCatalogState(surface, current);
  const terms = state.query.trim().toLowerCase().split(/\s+/u).filter(Boolean);
  const matches = new Set(surface.search.documents.filter(document => {
    const text = document.text.toLowerCase();
    return terms.every(term => text.includes(term));
  }).map(document => document.record));
  const results = surface.home.groups.flatMap(group => group.items).filter(card => matches.has(card.record));
  const content = state.selectedId === null ? surface.home : surface.details.find(detail => detail.record === state.selectedId)!;
  return freezeDeep({ content, results, query: state.query, selectedId: state.selectedId });
}
```

## src/public-catalog/exercises.ts

Source SHA-256: dce0d0f6bd3f7f7901d026dd362e24853c4adade586ba505a36c530a0ce7fd77

```ts
import { bankNode } from "../interaction/bank-node.ts";
import { PlaceContentSchema, placeContent, stackNodes, type PlaceContent } from "../interaction/place.ts";

export const PublicCatalogExercisesSchema = PlaceContentSchema;
export type PublicCatalogExercises = PlaceContent;

/** Local drafts are explicitly not controller commands, approvals, or durable accepted results. */
export function checkPublicCatalogExercises(exercises: PublicCatalogExercises, assets?: ReadonlySet<string>, records?: ReadonlySet<string>): void {
  placeContent(exercises);
  for (const stack of exercises.stacks) {
    for (const value of stackNodes(stack.items)) {
      const node = bankNode(value);
      if (node.kind === "catalog.card") {
        if (assets && !assets.has(node.image.asset)) throw new Error("INVALID_CATALOG_EXERCISE_ASSET_REFERENCE");
        if (records && !records.has(node.record)) throw new Error("INVALID_CATALOG_EXERCISE_RECORD_REFERENCE");
      } else if ("control" in node) {
        if (node.control.kind === "image" || node.control.kind === "avatar") {
          if (typeof node.control.source === "string") throw new Error("INVALID_CATALOG_EXERCISE_HOST_MEDIA");
          if (node.control.source !== null && assets && !assets.has(node.control.source.asset)) {
            throw new Error("INVALID_CATALOG_EXERCISE_ASSET_REFERENCE");
          }
        }
      } else if (!["input.text", "input.multiline", "fact"].includes(node.kind)) throw new Error("INVALID_CATALOG_EXERCISE_LOCAL_ONLY");
    }
  }
}
```

## src/public-catalog/draft.ts

Source SHA-256: f82788c202d781592d627d1b943918545118db3137df30cb4d7004f81920dfcb

```ts
import { bankEvent } from "../interaction/bank-events.ts";
import { controlBankNode } from "../interaction/bank-node.ts";
import { applyControlEvent } from "../interaction/control-nodes.ts";
import { freezeDeep } from "../json.ts";
import { checkPublicCatalogExercises, type PublicCatalogExercises } from "./exercises.ts";
import { stackNode, type StackNode } from "../interaction/place.ts";

/** Local session state only. No admission, persistence, controller command or success receipt. */
export function reduceCatalogDraft(current: PublicCatalogExercises, input: unknown): PublicCatalogExercises {
  checkPublicCatalogExercises(current);
  const event = bankEvent(input);
  if (event.kind !== "input.change" && !("control" in event)) throw new Error("LOCAL_DRAFT_EVENT_REQUIRED");
  let matched = false;
  function update(node: StackNode): StackNode {
    if (event.kind === "input.change" && (node.kind === "input.text" || node.kind === "input.multiline") && node.name === event.name) {
      if (node.disabled) throw new Error("CONTROL_DISABLED");
      matched = true;
      return stackNode({ ...node, value: event.value });
    }
    if ("control" in event && "control" in node && node.control.id === event.control) {
      matched = true;
      return stackNode(controlBankNode(applyControlEvent(node.control, event).node));
    }
    return node;
  }
  const stacks = current.stacks.map(stack => ({ ...stack, items: stack.items.map(update) }));
  if (!matched) throw new Error("UNKNOWN_DRAFT_TARGET");
  return freezeDeep({ ...current, stacks });
}
```

## src/public-catalog/capabilities.ts

Source SHA-256: ca16d7387483da09c6dbff9929cf9f5430133beca3b10856ae82c2ba82d59207

```ts
import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { closedObject, nonemptyText } from "./node-schema.ts";
import type { BankNode } from "../interaction/bank-node.ts";
import { ControlEventSchema } from "../interaction/control-nodes.ts";
import type { Face } from "../interaction/face.ts";

/** Semantic capabilities only. Pointer, keyboard and haptics belong to platform adapters. */
export const RendererRequirementsSchema = closedObject({
  protocol: Type.Literal("desert.renderer-requirements/1"), bank: Type.Literal("desert.bank-node/1"),
  nodes: Type.Array(nonemptyText(), { uniqueItems: true }),
  events: Type.Array(nonemptyText(), { uniqueItems: true }),
  features: Type.Array(nonemptyText(), { uniqueItems: true }),
});
export type RendererRequirements = Frozen<Static<typeof RendererRequirementsSchema>>;
export const PublicCatalogRequirements = freezeDeep({
  protocol: "desert.renderer-requirements/1", bank: "desert.bank-node/1",
  nodes: ["catalog.card", "catalog.home", "catalog.detail"],
  events: ["catalog.open", "catalog.back", "catalog.search"],
  features: ["catalog.browse", "catalog.search.local", "assets.logical"],
} satisfies Static<typeof RendererRequirementsSchema>);

/** A host must supply truthful capabilities; this check does not install any renderer. */
export function requirePublicCatalogCapabilities(candidate: unknown, requirements: RendererRequirements = PublicCatalogRequirements): void {
  const capabilities = jsonSnapshot(candidate);
  if (!Check(RendererRequirementsSchema, capabilities)) throw new Error("INVALID_RENDERER_CAPABILITIES");
  for (const category of ["nodes", "events", "features"] as const) {
    for (const required of requirements[category]) {
      if (!capabilities[category].includes(required)) throw new Error(`MISSING_RENDERER_CAPABILITY:${category}:${required}`);
    }
  }
}

function requireFace(features: Set<string>, face: Face | undefined): void {
  if (face?.kind === "symbol" || face?.kind === "flag") features.add(`face.${face.kind}`);
}

/** Derive local workbench needs from the same canonical control event grammar. */
export function publicCatalogRequirements(nodes: readonly BankNode[] = [], gallery = false): RendererRequirements {
  if (nodes.length === 0 && !gallery) return PublicCatalogRequirements;
  const nodeKinds = new Set<string>(PublicCatalogRequirements.nodes);
  const events = new Set<string>(PublicCatalogRequirements.events);
  const features = new Set<string>([...PublicCatalogRequirements.features, ...(nodes.length ? ["bank.local-draft"] : []),
    ...(gallery ? ['media.gallery'] : [])]);
  for (const node of nodes) {
    nodeKinds.add(node.kind);
    if (node.kind === "input.text" || node.kind === "input.multiline") events.add("input.change");
    if (node.kind === "input.multiline" && node.maxLength !== undefined) features.add("input.length-hint");
    if (node.kind === "input.text" && node.mask || node.kind === "control.money") features.add("input.mask.decimal");
    const options = node.kind === "control.select" ? node.control.options :
      node.kind === "control.money" ? node.control.currencies : [];
    for (const { face } of options) if (face) {
      features.add("selection.faces");
      requireFace(features, face);
    }
    if (node.kind === "transient") requireFace(features, node.frame.top.face);
    if ("control" in node) {
      for (const schema of ControlEventSchema.anyOf) {
        const kind = schema.properties.kind.const;
        if (kind.startsWith(`${node.control.kind}.`)) events.add(kind);
      }
    }
  }
  return freezeDeep({ ...PublicCatalogRequirements, nodes: [...nodeKinds], events: [...events],
    features: [...features] });
}
```

## src/public-catalog/protocol.ts

Source SHA-256: 087417b2387512a4c66dad44a37276d8269ab821f698c487b2248741e1d52380

```ts
import { freezeDeep } from "../json.ts";
import { PublicCatalogDefinitionSchema, PublicCatalogSurfaceSchema, PublicCatalogStateSchema } from "./schema.ts";
import { CatalogCardSchema, CatalogHomeSchema, CatalogDetailSchema } from "./node-schema.ts";
import { CatalogEventSchema } from "./events.ts";
import { RendererRequirementsSchema } from "./capabilities.ts";
import { PublicCatalogExercisesSchema } from "./exercises.ts";

/** TypeScript and portable JSON Schema originate from the same grammar, not a second native definition. */
export function publicCatalogSchemas() {
  const schemas = { definition: PublicCatalogDefinitionSchema, surface: PublicCatalogSurfaceSchema,
    state: PublicCatalogStateSchema, card: CatalogCardSchema, home: CatalogHomeSchema,
    detail: CatalogDetailSchema, event: CatalogEventSchema, requirements: RendererRequirementsSchema, exercises: PublicCatalogExercisesSchema };
  // TypeBox symbol metadata is intentionally not part of the wire artifact.
  return freezeDeep(JSON.parse(JSON.stringify(schemas)) as Record<keyof typeof schemas, Record<string, unknown>>);
}
```

## src/public-catalog/client.ts

Source SHA-256: 0b9bf242a8eb4fec9117758d61388012a32311fc5642cec9be52842222c5ec2e

```ts
/** Browser/native-adapter entry: no compiler, filesystem, controller or Node crypto. */
export { projectPublicCatalog, type PublicCatalogProjection } from "./project.ts";
export { reducePublicCatalog, initialPublicCatalogState } from "./reducer.ts";
export { publicCatalogSurface } from "./surface.ts";
export { PublicCatalogRequirements, publicCatalogRequirements, requirePublicCatalogCapabilities, type RendererRequirements } from "./capabilities.ts";
export type { PublicCatalogSurface, PublicCatalogState } from "./schema.ts";
export type { PublicCatalogExercises } from "./exercises.ts";
export type { CatalogEvent } from "./events.ts";
```

## src/build/public-catalog/build.ts

Source SHA-256: 39c2ef666cf393dc0df0b8b4cc8cf6c983658b58ccf875b96de615718c7b2e0d

```ts
import { mkdirSync, cpSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import type { CompiledPublicCatalog } from "../../public-catalog/index.ts";
import { createBuildProject } from "../svelte/project.ts";
import { rendererRevision } from "../svelte/revision.ts";
import { fileInventory } from "../files.ts";
import { bindCatalogAssets } from "./assets.ts";
import { catalogBuildFile, type PublicCatalogBuild } from "./manifest.ts";
import { publicCatalogSchemas } from "../../public-catalog/protocol.ts";
import { prepareRenditions } from './renditions.ts';

/** Experimental read-only family; no controller, business writes, or implicit migration. */
export async function buildPublicCatalogWeb(application: CompiledPublicCatalog, options: {
  outputDirectory: string; sourceRoot: string;
}) {
  const output = resolve(options.outputDirectory);
  if (existsSync(output)) throw new Error("BUILD_DESTINATION_EXISTS");
  const assets = bindCatalogAssets(options.sourceRoot, application.assets);
  await prepareRenditions(assets);
  const source = `export const surface = ${JSON.stringify(application.surface)};\n`;
  const project = createBuildProject(source, "public-catalog");
  const revision = rendererRevision();
  let ownsOutput = false;
  try {
    await project.run("build");
    if (rendererRevision() !== revision) throw new Error("BUILDER_CHANGED_DURING_BUILD");
    mkdirSync(dirname(output), { recursive: true });
    mkdirSync(output); ownsOutput = true;
    cpSync(join(project.directory, "build"), join(output, "web"), { recursive: true });
    writeFileSync(join(output, "package.json"), JSON.stringify({ private: true, type: "module" }));
    writeFileSync(join(output, "surface.json"), JSON.stringify(application.surface, null, 2) + "\n");
    writeFileSync(join(output, "schemas.json"), JSON.stringify(publicCatalogSchemas(), null, 2) + "\n");
    const manifest: PublicCatalogBuild = {
      format: "desert.public-catalog-build/1", productId: application.id, contractDigest: application.digest,
      rendererRevision: revision, mode: "public-read-only", mediaPolicy: "external-local-bindings",
      assets: assets.map(({ file: _file, ...metadata }) => metadata), files: fileInventory(output),
    };
    writeFileSync(join(output, catalogBuildFile), JSON.stringify(manifest, null, 2) + "\n");
    return manifest;
  } catch (error) {
    if (ownsOutput) rmSync(output, { recursive: true });
    throw error;
  } finally { project.close(); }
}
```

## src/build/public-catalog/manifest.ts

Source SHA-256: ba60e1df672a294b290a1a1a9034b04da05c33a876d1e2c06fd3b4c7b130fa35

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { digest, fileInventory } from "../files.ts";
import { freezeDeep } from "../../json.ts";
import { publicCatalogSurface } from "../../public-catalog/surface.ts";
import { LogicalIdSchema } from "../../public-catalog/node-schema.ts";
import { catalogMediaTypes } from "./assets.ts";
import { stackNodes } from "../../interaction/place.ts";

export const catalogBuildFile = "PUBLIC-CATALOG-BUILD.json";
const sha = Type.String({ pattern: "^[a-f0-9]{64}$" });
const closed = { additionalProperties: false };
const schema = Type.Object({
  format: Type.Literal("desert.public-catalog-build/1"), productId: LogicalIdSchema, contractDigest: sha,
  rendererRevision: sha, mode: Type.Literal("public-read-only"), mediaPolicy: Type.Literal("external-local-bindings"),
  assets: Type.Array(Type.Object({ id: LogicalIdSchema, digest: sha, size: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
    mediaType: Type.Union([...new Set(Object.values(catalogMediaTypes))].map(type => Type.Literal(type))) }, closed), { minItems: 1 }),
  files: Type.Record(Type.String(), sha),
}, closed);
export type PublicCatalogBuild = Static<typeof schema>;
export function loadPublicCatalogBuild(directory: string) {
  const files = fileInventory(directory, [catalogBuildFile]);
  const value: unknown = JSON.parse(readFileSync(join(directory, catalogBuildFile), "utf8"));
  if (!Check(schema, value)) throw new Error("INVALID_PUBLIC_CATALOG_BUILD");
  if (digest(value.files) !== digest(files)) throw new Error("BUILD_FILES_MISMATCH");
  if (!Object.hasOwn(files, "surface.json") || !Object.hasOwn(files, "web/handler.js")) throw new Error("INVALID_PUBLIC_CATALOG_BUILD");
  const surface = publicCatalogSurface(JSON.parse(readFileSync(join(directory, "surface.json"), "utf8")));
  if (value.productId !== surface.productId || value.contractDigest !== surface.digest) throw new Error("BUILD_SURFACE_MISMATCH");
  const identities = new Set(value.assets.map(asset => asset.id));
  if (identities.size !== value.assets.length) throw new Error("INVALID_PUBLIC_CATALOG_BUILD");
  const references = [surface.home.featured.image.asset, ...surface.details.map(detail => detail.image.asset),
    ...surface.home.groups.flatMap(group => group.items.map(item => item.image.asset))];
  for (const detail of surface.details) references.push(...(detail.gallery ?? []).map(image => image.asset));
  if (surface.featuredMedia?.kind === 'gallery') {
    references.push(...surface.featuredMedia.images.map(image => image.asset));
  } else if (surface.featuredMedia) {
    references.push(surface.featuredMedia.asset);
    if (surface.featuredMedia.kind === 'video' && surface.featuredMedia.poster) references.push(surface.featuredMedia.poster);
    const featured = surface.featuredMedia;
    const media = value.assets.find(asset => asset.id === featured.asset);
    if (media && !media.mediaType.startsWith(`${surface.featuredMedia.kind}/`)) throw new Error('CATALOG_FEATURED_MEDIA_TYPE_MISMATCH');
  }
  for (const stack of surface.exercises?.stacks ?? []) for (const node of stackNodes(stack.items)) {
    if (node.kind === "catalog.card") references.push(node.image.asset);
    if ("control" in node && (node.control.kind === "image" || node.control.kind === "avatar") &&
        node.control.source !== null && typeof node.control.source !== "string") references.push(node.control.source.asset);
  }
  if (references.some(id => !identities.has(id))) throw new Error("CATALOG_MEDIA_REFERENCE_MISSING");
  const galleryImages = [...surface.details.flatMap(detail=>(detail.gallery ?? []).map(image=>image.asset)),
    ...(surface.featuredMedia?.kind === 'gallery' ? surface.featuredMedia.images.map(image=>image.asset) : [])];
  if (galleryImages.some(id=>!value.assets.find(asset=>asset.id===id)?.mediaType.startsWith('image/'))) {
    throw new Error('CATALOG_FEATURED_MEDIA_TYPE_MISMATCH');
  }
  return freezeDeep(value);
}
```

## src/build/public-catalog/assets.ts

Source SHA-256: c2132f31c386c078c6257adbc187a7d24ce8ecf9f8a6118eabc75941c38d8cf4

```ts
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { resolve, join, extname, isAbsolute } from "node:path";
import { hash } from "../files.ts";

export type CatalogAssetBinding = Readonly<{ id: string; path: string; alt: string }>;
export type BoundCatalogAsset = Readonly<{
  id: string; file: string; digest: string; size: number; mediaType: string;
}>;
export const catalogMediaTypes: Readonly<Record<string, string>> = Object.freeze({
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif",
  ".mp4": "video/mp4", ".webm": "video/webm",
});

/** Host-owned file bindings never enter the portable surface or downloadable build. */
export function bindCatalogAssets(sourceRoot: string, assets: readonly CatalogAssetBinding[]): readonly BoundCatalogAsset[] {
  const root = realpathSync(resolve(sourceRoot));
  if (!lstatSync(root).isDirectory()) throw new Error("CATALOG_MEDIA_ROOT_REQUIRED");
  const identities = new Set<string>();
  return Object.freeze(assets.map(asset => {
    if (identities.has(asset.id)) throw new Error("DUPLICATE_CATALOG_MEDIA");
    identities.add(asset.id);
    const parts = asset.path.split("/");
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(asset.id) || isAbsolute(asset.path) ||
      /[\\:%?#\x00-\x1f\x7f]/u.test(asset.path) || parts.some(part => !part || part === "." || part === "..")) {
      throw new Error("UNSAFE_CATALOG_MEDIA_PATH");
    }
    let file = root;
    for (const part of parts) {
      file = join(file, part);
      if (lstatSync(file).isSymbolicLink()) throw new Error("CATALOG_MEDIA_SYMLINK");
    }
    const mediaType = catalogMediaTypes[extname(file).toLowerCase()];
    if (!mediaType || !lstatSync(file).isFile()) throw new Error("UNSUPPORTED_CATALOG_MEDIA");
    const bytes = readFileSync(file);
    return Object.freeze({ id: asset.id, file, digest: hash(bytes), size: bytes.length, mediaType });
  }));
}
```

## src/build/public-catalog/serve.ts

Source SHA-256: 09a826d74733d0bf75eeb0b5c2425dc11bf1d2410412c24c793de5367cd2546e

```ts
import { createServer, type RequestListener } from "node:http";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { hash, digest } from "../files.ts";
import { publicHandler } from "../public-handler.ts";
import { loadPublicCatalogBuild } from "./manifest.ts";
import { bindCatalogAssets, type CatalogAssetBinding } from "./assets.ts";
import { sendCatalogMedia } from './media-response.ts';
import { prepareRenditions, renditionWidths } from './renditions.ts';

/** Private benchmark host. Images remain external local bindings, never exported in the build. */
export async function servePublicCatalog(options: {
  buildDirectory: string; sourceRoot: string; assets: readonly CatalogAssetBinding[]; port?: number;
}) {
  const original = loadPublicCatalogBuild(options.buildDirectory);
  const directory = mkdtempSync(join(tmpdir(), "desert-public-catalog-"));
  try {
    cpSync(options.buildDirectory, directory, { recursive: true });
    const manifest = loadPublicCatalogBuild(directory);
    if (digest(original) !== digest(manifest)) throw new Error("BUILD_CHANGED_DURING_SNAPSHOT");
    const media = bindCatalogAssets(options.sourceRoot, options.assets);
    if (digest(media.map(({ file: _file, ...value }) => value)) !== digest(manifest.assets)) {
      throw new Error("CATALOG_MEDIA_MISMATCH");
    }
    const images = new Map(media.map(asset => {
      const bytes = readFileSync(asset.file);
      if (hash(bytes) !== asset.digest) throw new Error("CATALOG_MEDIA_CHANGED");
      return [asset.id, { ...asset, bytes }] as const;
    }));
    const renditions = await prepareRenditions(media);
    const loaded = await import(pathToFileURL(join(directory, "web/handler.js")).href);
    if (typeof loaded.handler !== "function") throw new Error("INVALID_WEB_HANDLER");
    const render = publicHandler(manifest, loaded.handler as RequestListener);
    const server = createServer((request, response) => {
      if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405, { Allow: "GET, HEAD" }); response.end(); return;
      }
      let path: string;
      try { path = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname); }
      catch { response.writeHead(400); response.end(); return; }
      if (path.startsWith("/media/")) {
        const asset = images.get(path.slice(7));
        if (!asset) { response.writeHead(404); response.end(); return; }
        const width = new URL(request.url!, 'http://127.0.0.1').searchParams.get('w');
        if (width !== null) {
          if (!(renditionWidths as readonly number[]).includes(Number(width))) {
            response.writeHead(400); response.end(); return;
          }
          const variant = renditions.get(`${asset.id}:${Number(width)}`);
          if (!variant) { response.writeHead(404); response.end(); return; }
          sendCatalogMedia(request, response, variant); return;
        }
        sendCatalogMedia(request, response, asset); return;
      }
      render(request, response);
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject); server.listen(options.port ?? 0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("CATALOG_ADDRESS_REQUIRED");
    return { origin: `http://127.0.0.1:${address.port}`,
      async close() {
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        images.clear(); renditions.clear(); rmSync(directory, { recursive: true });
      },
    };
  } catch (error) { rmSync(directory, { recursive: true }); throw error; }
}
```

## src/build/public-catalog/renditions.ts

Source SHA-256: 5572437d2ecc0025c9a49186c3481a236760a642d073a9c726049fa66e9b8e42

```ts
import sharp from 'sharp';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hash } from '../files.ts';
import type { BoundCatalogAsset } from './assets.ts';

export const renditionWidths = [160, 320, 640, 1280, 1920, 2560] as const;
const recipe = `webp-q82-alpha100-effort4-srgb-auto-orient-v1-${sharp.versions.sharp}-${sharp.versions.vips}`;
const cache = join(tmpdir(), 'desert-media-renditions-v1');
export type Rendition = { bytes: Buffer; size: number; mediaType: string; digest: string };

/** Decode at build/host preparation, not while handling display requests. Originals are immutable. */
export async function createRendition(bytes: Buffer, edge: number): Promise<Buffer> {
  if (!(renditionWidths as readonly number[]).includes(edge)) throw new Error('INVALID_MEDIA_RENDITION_SIZE');
  return sharp(bytes, { limitInputPixels: 80_000_000 }).autoOrient()
    .resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true })
    .withIccProfile('srgb').webp({ quality: 82, alphaQuality: 100, effort: 4 }).toBuffer();
}

export async function prepareRenditions(assets: readonly BoundCatalogAsset[]) {
  await mkdir(cache, { recursive: true });
  const result = new Map<string, Rendition>();
  // Two sources at a time; each source's variants are generated serially.
  const queue = assets.filter(asset => asset.mediaType.startsWith('image/'));
  async function worker() {
    for (let asset = queue.shift(); asset; asset = queue.shift()) {
      const original = await readFile(asset.file);
      if (hash(original) !== asset.digest) throw new Error('CATALOG_MEDIA_CHANGED');
      for (const edge of renditionWidths) {
        const key = hash(Buffer.from(`${asset.digest}-${recipe}-${edge}`));
        const file = join(cache, `${key}.webp`);
        let bytes: Buffer;
        try {
          bytes = await readFile(file);
          const expected = await readFile(`${file}.sha256`, 'utf8');
          if (hash(bytes) !== expected) throw new Error('MEDIA_CACHE_MISMATCH');
        } catch {
          bytes = await createRendition(original, edge);
          const pending = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
          await writeFile(pending, bytes); await rename(pending, file);
          await writeFile(`${file}.sha256`, hash(bytes));
        }
        result.set(`${asset.id}:${edge}`, { bytes, size: bytes.length, mediaType: 'image/webp', digest: hash(bytes) });
      }
    }
  }
  await Promise.all([worker(), worker()]);
  return result;
}
```

## src/svelte/pieces/media/source.ts

Source SHA-256: f7bf07675e64effdeea738907e3a73ccce692d97ac9f0dc9cd656479503a236f

```ts
export type Photo = Readonly<{ source: string; alt: string }>;
export const mediaSource = (asset: string) => `/media/${encodeURIComponent(asset)}`;
export const catalogPhotos = (images: readonly { asset: string; alt: string }[]): Photo[] =>
  images.map(image => ({ source: mediaSource(image.asset), alt: image.alt }));
export function imageSource(source: string, edge: number) {
  if (!/^\/media\/[^/?#]+$/.test(source) || source.endsWith(".svg")) return source;
  const bucket = [160, 320, 640, 1280, 1920, 2560].find(size => size >= edge) ?? 2560;
  return `${source}?w=${bucket}`;
}

const pending = new Set<string>(), decoded = new Map<string, HTMLImageElement>();
let active = 0;
/** Intent/neighbor warming only: at most two requests, four queued, eight decoded photos. */
export function prefetchImage(source: string, edge: number) {
  if (typeof navigator === 'undefined' || (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
  const url = imageSource(source, edge);
  if (decoded.has(url) || pending.has(url) || pending.size >= 4) return;
  pending.add(url); drain();
}
function drain() {
  while (active < 2 && pending.size) {
    const url = pending.values().next().value!; pending.delete(url);
    if (decoded.has(url)) continue;
    const image = new Image(); image.decoding = 'async'; image.fetchPriority = 'low';
    decoded.set(url, image); active++; image.src = url;
    void image.decode().catch(() => { decoded.delete(url); }).finally(() => {
      active--;
      while (decoded.size > 8) decoded.delete(decoded.keys().next().value!);
      drain();
    });
  }
}
```

## src/svelte/pieces/media/Image.svelte

Source SHA-256: 174198ce4e636302fd98b6e4ad6b077fb7dde0be9760cc1d2399c302ce09e463

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '../../vendor/components/ui/button/index.js';
  import { imageSource } from './source.ts';
  let { source, alt, edge = 640, zoom = 1, retry = false, onready, fallback = 'Image unavailable' }: {
    source: string; alt: string; edge?: number; zoom?: number; retry?: boolean;
    onready?: () => void; fallback?: string;
  } = $props();
  let host!: HTMLDivElement;
  let measured = $state(0), attempt = $state(0), ready = $state(''), failed = $state('');
  let original = $state('');
  const url = $derived(original === source ? source : imageSource(source, (measured || edge) * zoom));
  // A new asset gets a new DOM image immediately. A larger rendition of the SAME
  // asset keeps its decoded pixels while loading, so pinch/resize never flashes.
  const identity = $derived(`${source}|${attempt}`);
  onMount(() => {
    const resize = () => { measured = Math.ceil(Math.max(host.clientWidth,host.clientHeight)*window.devicePixelRatio); };
    const observer = new ResizeObserver(([entry]) => {
      if (entry) measured = Math.ceil(Math.max(entry.contentRect.width, entry.contentRect.height) * window.devicePixelRatio);
    });
    observer.observe(host); window.addEventListener('resize',resize);
    return () => { observer.disconnect(); window.removeEventListener('resize',resize); };
  });
  async function loaded(img: HTMLImageElement, key: string) {
    const requested = img.src;
    try { await img.decode(); } catch {
      if (requested === img.src && img.isConnected) error(key);
      return;
    }
    if (key !== identity || !img.isConnected || requested !== img.src) return;
    ready = key; onready?.();
  }
  function error(key: string) {
    if (key !== identity) return;
    // Older hosts and unsupported codecs keep an original-file fallback.
    if (url !== source) { original = source; return; }
    failed = key;
  }
</script>

<div bind:this={host} data-media-image data-image-state={failed === identity ? 'error' : ready === identity ? 'ready' : 'loading'}>
  {#key identity}
    {@const key = identity}
    <img src={url} {alt} decoding="async" draggable="false" style:visibility={ready === key && failed !== key ? 'visible' : 'hidden'}
      onload={event => loaded(event.currentTarget as HTMLImageElement, key)} onerror={() => error(key)} />
  {/key}
  {#if failed === identity}
    <div data-media-error role="img" aria-label={alt}>
      <span>{fallback}</span>
      {#if retry}<Button variant="secondary" onclick={() => { original = ''; attempt++; }}>Retry</Button>{/if}
    </div>
  {/if}
</div>
```

## src/svelte/pieces/media/PhotoCollection.svelte

Source SHA-256: 3e8cc80583db050581fcf445e2ed8b02651dcf0d28ca905710d02cfcf190dae2

```svelte
<script lang="ts">
  import Image from './Image.svelte';
  import Viewer from './Viewer.svelte';
  import { mediaGestures } from './gestures.ts';
  import { prefetchImage, type Photo } from './source.ts';
  let { photos, title, header = false }: { photos: readonly Photo[]; title: string; header?: boolean } = $props();
  let index = $state(0), open = $state(false);
  let host!: HTMLDivElement, opener!: HTMLButtonElement;
  const selected = $derived(photos[index] ?? photos[0]!);
  function select(next: number) { index = Math.max(0,Math.min(photos.length-1,next)); }
  function drag(button: HTMLButtonElement) {
    return mediaGestures(button, { image: () => host.querySelector('img'),
      page: direction => select(index+direction), canPage:()=>photos.length>1 });
  }
  $effect(() => {
    const current = index;
    if (typeof window === 'undefined') return;
    for (const neighbor of [photos[current-1],photos[current+1]]) if (neighbor)
      prefetchImage(neighbor.source, Math.max(host?.clientWidth || 640,host?.clientHeight || 0)*window.devicePixelRatio);
  });
  function key(event: KeyboardEvent) {
    if (event.key==='ArrowRight' || event.key==='ArrowLeft') {
      event.preventDefault(); select(index+(event.key==='ArrowRight'?1:-1));
    }
  }
</script>

<div bind:this={host} data-photo-collection data-header-collection={header || undefined}>
  <Image source={selected.source} alt={selected.alt} edge={header ? 1280 : 640} retry />
  <button bind:this={opener} use:drag data-media-open aria-label="Open photo viewer"
    onclick={() => open=true} onkeydown={key}></button>
  {#if photos.length>1}
    <div data-media-dots aria-label="Choose photo">
      {#each photos as photo, i (photo.source)}
        <button aria-label={`Photo ${i+1}: ${photo.alt}`} aria-current={i===index ? 'true' : undefined}
          onclick={() => select(i)}></button>
      {/each}
    </div>
  {/if}
</div>
{#if open}
  <Viewer {photos} {title} bind:index bind:open onreturn={() => opener?.focus({ preventScroll:true })} />
{/if}
```

## src/svelte/pieces/media/Viewer.svelte

Source SHA-256: 78abaf4f43ad4afed18ac463a77682a82379b08ad2bdfd8f7b5982f6f997aae4

```svelte
<script lang="ts">
  import * as Dialog from '../../vendor/components/ui/dialog/index.js';
  import { Button } from '../../vendor/components/ui/button/index.js';
  import X from '@lucide/svelte/icons/x';
  import Minus from '@lucide/svelte/icons/minus';
  import Plus from '@lucide/svelte/icons/plus';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import ToolbarLayout from '../ToolbarLayout.svelte';
  import Image from './Image.svelte';
  import { mediaGestures } from './gestures.ts';
  import { type Photo } from './source.ts';
  let { photos, title, index = $bindable(0), open = $bindable(false), onreturn }: {
    photos: readonly Photo[]; title: string; index?: number; open?: boolean; onreturn: () => void;
  } = $props();
  let scale = $state(1), stage!: HTMLDivElement;
  let closeButton = $state<HTMLButtonElement | null>(null);
  let gesture: ReturnType<typeof mediaGestures> | undefined;
  const selected = $derived(photos[index]!);
  function select(next: number) { index=Math.max(0,Math.min(photos.length-1,next)); gesture?.reset(); }
  function manipulate(element: HTMLDivElement) {
    gesture=mediaGestures(element,{ image:()=>element.querySelector('img'),
      page:direction=>select(index+direction), canPage:()=>photos.length>1, zoomable:true, onzoom:value=>scale=value });
    return { destroy:()=>gesture?.destroy() };
  }
  function key(event: KeyboardEvent) {
    if ((event.target as HTMLElement).closest('[data-media-thumbs]')) return;
    if (event.key==='ArrowRight' || event.key==='ArrowLeft') {
      event.preventDefault(); if (scale===1) select(index+(event.key==='ArrowRight'?1:-1));
    } else if (event.key==='+' || event.key==='=') { event.preventDefault(); gesture?.zoom(scale+1); }
    else if (event.key==='-') { event.preventDefault(); gesture?.zoom(scale-1); }
    else if (event.key==='0') { event.preventDefault(); gesture?.reset(); }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content presentation="media" showCloseButton={false} data-media-viewer
    onOpenAutoFocus={event=>{ event.preventDefault(); closeButton?.focus({preventScroll:true}); }}
    onCloseAutoFocus={event=>{ event.preventDefault(); onreturn(); }} onkeydown={key}>
    <ToolbarLayout>
      <Button bind:ref={closeButton} variant="secondary" size="icon-lg" aria-label="Close photo viewer" onclick={()=>open=false}><X /></Button>
      <div data-media-identity>
        <Dialog.Title>{title}</Dialog.Title>
        <span data-media-count>{index+1} / {photos.length}</span>
      </div>
      <div data-media-zoom-tools>
        <Button variant="secondary" size="icon-lg" aria-label="Zoom out" disabled={scale<=1} onclick={()=>gesture?.zoom(scale-1)}><Minus /></Button>
        <Button variant="secondary" aria-label="Reset zoom" onclick={()=>gesture?.reset()}><span data-media-zoom>{Math.round(scale*100)}%</span></Button>
        <Button variant="secondary" size="icon-lg" aria-label="Zoom in" disabled={scale>=4} onclick={()=>gesture?.zoom(scale+1)}><Plus /></Button>
      </div>
    </ToolbarLayout>
    <Dialog.Description class="sr-only">Swipe or use arrows to change photos. Pinch, double-click or use plus and minus to zoom. Drag to pan when zoomed. Escape closes the viewer.</Dialog.Description>
    <div bind:this={stage} use:manipulate data-media-stage>
      <Image source={selected.source} alt={selected.alt} edge={1920} zoom={scale} retry onready={()=>gesture?.refresh()} />
      {#if photos.length>1}
        <Button data-media-prev variant="secondary" size="icon-lg" aria-label="Previous photo" disabled={index===0 || scale>1} onclick={()=>select(index-1)}><ChevronLeft /></Button>
        <Button data-media-next variant="secondary" size="icon-lg" aria-label="Next photo" disabled={index===photos.length-1 || scale>1} onclick={()=>select(index+1)}><ChevronRight /></Button>
      {/if}
    </div>
    {#if photos.length>1}
      <ToolbarLayout edge="bottom">
        <div data-media-thumbs aria-label="Photos">
          {#each photos as photo, i (photo.source)}
            <Button variant="ghost" aria-label={`Photo ${i+1}: ${photo.alt}`} aria-current={i===index ? 'true' : undefined}
              onclick={()=>select(i)}><Image source={photo.source} alt="" edge={160} /></Button>
          {/each}
        </div>
      </ToolbarLayout>
    {/if}
  </Dialog.Content>
</Dialog.Root>
```

## src/svelte/pieces/media/gestures.ts

Source SHA-256: 3d854b195074a47facde60372cfa4dcf951ae48eafcf1077d216640f537a6dde

```ts
type Options = {
  image: () => HTMLImageElement | null; page: (direction: number) => void;
  canPage: () => boolean; zoomable?: boolean; onzoom?: (scale: number) => void;
};
/** Pointer ownership is local to the canvas. Vertical header gestures remain native scrolling. */
export function mediaGestures(element: HTMLElement, options: Options) {
  const points = new Map<number, { x: number; y: number }>();
  let scale = 1, x = 0, y = 0, dragged = false, suppress = false;
  let start: { x: number; y: number; px: number; py: number } | undefined;
  let pinch: { distance: number; scale: number } | undefined;
  const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
  function paint() {
    options.onzoom?.(scale);
    const img = options.image(); if (!img || !img.naturalWidth) return;
    const box = element.getBoundingClientRect(), ratio = Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight);
    const maxX = Math.max(0, (img.naturalWidth * ratio * scale - box.width) / 2);
    const maxY = Math.max(0, (img.naturalHeight * ratio * scale - box.height) / 2);
    x = clamp(x, -maxX, maxX); y = clamp(y, -maxY, maxY);
    img.style.transform = scale === 1 ? '' : `translate(${x}px,${y}px) scale(${scale})`;
  }
  function zoom(value: number) { scale = clamp(value, 1, 4); if (scale === 1) x = y = 0; paint(); }
  function distance() { const [a,b] = [...points.values()]; return a && b ? Math.hypot(a.x-b.x, a.y-b.y) : 1; }
  function down(e: PointerEvent) {
    if (e.button !== 0 || ((e.target as HTMLElement).closest('button') && !(e.target as HTMLElement).closest('[data-media-open]'))) return;
    points.set(e.pointerId, { x:e.clientX, y:e.clientY });
    element.setPointerCapture(e.pointerId); dragged = false; suppress = false;
    start = { x:e.clientX, y:e.clientY, px:x, py:y };
    if (points.size === 2 && options.zoomable) { pinch = { distance:distance(), scale }; dragged = true; }
  }
  function move(e: PointerEvent) {
    if (!points.has(e.pointerId)) return;
    points.set(e.pointerId, { x:e.clientX, y:e.clientY });
    if (pinch && points.size === 2) { zoom(pinch.scale * distance() / pinch.distance); dragged = true; return; }
    if (!start) return;
    const dx = e.clientX-start.x, dy = e.clientY-start.y;
    if (Math.hypot(dx,dy)>8) dragged = true;
    if (scale>1) { x=start.px+dx; y=start.py+dy; paint(); }
    else if (options.canPage() && Math.abs(dx)>Math.abs(dy)) {
      const img = options.image(); if (img) img.style.transform = `translateX(${dx*.55}px)`;
    }
  }
  function up(e: PointerEvent) {
    points.delete(e.pointerId); suppress = dragged;
    if (pinch) { if (!points.size) pinch=undefined; start=undefined; suppress=true; return; }
    if (!start) return;
    const dx=e.clientX-start.x,dy=e.clientY-start.y;
    if (scale===1 && options.canPage() && Math.abs(dx)>Math.max(40,element.clientWidth*.12) && Math.abs(dx)>Math.abs(dy)) options.page(dx<0?1:-1);
    paint(); start=undefined;
  }
  function cancel() { points.clear(); pinch=undefined; start=undefined; suppress=true; paint(); }
  function click(e: MouseEvent) { if (suppress && e.detail !== 0) { e.preventDefault(); e.stopImmediatePropagation(); suppress=false; } }
  function doubleClick() { if (options.zoomable) zoom(scale===1?2:1); }
  function wheel(e: WheelEvent) { if (options.zoomable && e.ctrlKey) { e.preventDefault(); zoom(scale*Math.exp(-e.deltaY*.01)); } }
  const controller = new AbortController(), signal = controller.signal;
  element.addEventListener('pointerdown',down,{signal}); element.addEventListener('pointermove',move,{signal});
  element.addEventListener('pointerup',up,{signal}); element.addEventListener('pointercancel',cancel,{signal});
  element.addEventListener('click',click,{signal,capture:true}); element.addEventListener('dblclick',doubleClick,{signal});
  element.addEventListener('wheel',wheel,{signal,passive:false});
  const resize = new ResizeObserver(paint); resize.observe(element);
  return { zoom, refresh:paint, reset:()=>zoom(1), destroy() { controller.abort(); resize.disconnect(); } };
}
```

## src/svelte/explorer/PublicCatalogProduct.svelte

Source SHA-256: ecf20c1c51d3f66fed911a5790e00ec34bf9a8043f85cb456c5f8e4751722827

```svelte
<script lang="ts">
  import { onMount, tick, untrack, setContext } from "svelte";
  import { initialPublicCatalogState, projectPublicCatalog, reducePublicCatalog, publicCatalogSurface,
    type PublicCatalogSurface, type PublicCatalogState } from "../../public-catalog/client.ts";
  import type { BankEvent } from "../../interaction/bank-events.ts";
  import CatalogWorkspace from "./CatalogWorkspace.svelte";
  import RetainedPlace from "./RetainedPlace.svelte";
  import CatalogHome from "./CatalogHome.svelte";
  import CatalogDetail from "./CatalogDetail.svelte";
  import type { PlaceIdentity } from "../pieces/place-identity.ts";
  import LocalExercises from "./LocalExercises.svelte";
  import PublicCatalogBank from "./PublicCatalogBank.svelte";
  import CatalogSearchResults from "./CatalogSearchResults.svelte";
  import { catalogSearchResults, catalogSearchScope, type CatalogDestination, type CatalogSearchResult } from "./catalog-search.ts";
  import { revealSearchTarget } from "./catalog-search-focus.ts";
  import type { PrimitiveId } from "../../interaction/catalog.ts";
  import { catalogHistory } from "./catalog-history.ts";
  import "../theme.css";
  let { surface }: { surface: PublicCatalogSurface } = $props();
  const definition = untrack(() => publicCatalogSurface(surface));
  setContext('catalog-photo-intent', (record: string) => definition.details.find(detail=>detail.record===record)?.image.asset);
  let viewState = $state.raw(initialPublicCatalogState());
  let active = $state<CatalogDestination>("browse");
  let bankVisited = $state(false);
  let bankQuery = $state("");
  let searching = $state(false);
  let searchQuery = $state("");
  let bank = $state<{ revealEntry: (id: PrimitiveId) => Promise<HTMLElement | null> } | null>(null);
  let view = $derived(projectPublicCatalog(definition, viewState));
  let scope = $derived(catalogSearchScope(definition, active));
  let results = $derived(catalogSearchResults(definition, active, searchQuery));
  let identity: PlaceIdentity = $derived(active === "bank"
    ? { title: "Component bank", subtitle: "Interactive examples. Changes stay here; no product commands are executed." }
    : active === "travel-kit" && definition.exercises
      ? { title: definition.exercises.title, subtitle: definition.exercises.subtitle }
      : view.content.kind === "catalog.detail"
        ? { title: view.content.title,
          subtitle: definition.home.groups.find(group => group.items.some(item => item.record === viewState.selectedId))?.title ?? '',
          media: view.content.gallery ? { kind: 'gallery', images:view.content.gallery } : { kind: 'image', ...view.content.image } }
        : { title: definition.title, subtitle: definition.description, media: definition.featuredMedia ?? { kind: 'image', ...definition.home.featured.image } });
  type Origin = { selector: string; scroll: number; destination: CatalogDestination; state: PublicCatalogState;
    search?: { query: string; scroll: number }; previous?: Origin };
  let opener: Origin | undefined;
  type Snapshot = { active: CatalogDestination; state: PublicCatalogState; opener?: Origin;
    searching: boolean; query: string; scroll: number; searchScroll: number; focus?: string };
  let browserNavigation: ReturnType<typeof catalogHistory<Snapshot>> | undefined;
  const navigation = [{ id: "browse", label: definition.title },
    ...(definition.exercises ? [{ id: "travel-kit", label: definition.exercises.title } as const] : []),
    { id: "bank", label: "Component bank" }] as const;
  const scroll = () => document.querySelector<HTMLElement>("[data-catalog-scroll]");
  const searchScroll = () => document.querySelector<HTMLElement>("[data-catalog-search-scroll]");
  function cancelSearch() { searching = false; searchQuery = ""; }
  async function querySearch(query: string) {
    searchQuery = query; searching = true;
    await tick(); searchScroll()?.scrollTo(0, 0);
  }
  async function event(input: BankEvent) {
    if (input.kind !== "catalog.open" && input.kind !== "catalog.back" && input.kind !== "catalog.search") return;
    if (input.kind === "catalog.search") { await querySearch(input.query); return; }
    if (input.kind === "catalog.open") {
      const focused = document.activeElement as HTMLElement | null;
      const marker = `catalog-return-${crypto.randomUUID()}`;
      if (focused) focused.dataset.catalogReturn = marker;
      browserNavigation?.capture();
      opener = { selector: searching ? `[data-search-result="${input.record}"] button` : `[data-catalog-return="${marker}"]`,
        scroll: scroll()?.scrollTop ?? 0, destination: active, state: viewState, previous: opener,
        ...(searching ? { search: { query: searchQuery, scroll: searchScroll()?.scrollTop ?? 0 } } : {}) };
      viewState = reducePublicCatalog(definition, viewState, input);
      active = "browse"; cancelSearch();
      await tick();
      scroll()?.scrollTo(0, 0);
      document.querySelector<HTMLElement>("[data-place-header] [data-place-title]")?.focus({ preventScroll: true });
      browserNavigation?.push();
      return;
    }
    if (browserNavigation?.back()) return;
    const origin = opener;
    opener = origin?.previous;
    viewState = origin?.state ?? reducePublicCatalog(definition, viewState, input);
    active = origin?.destination ?? "browse";
    searching = Boolean(origin?.search); searchQuery = origin?.search?.query ?? "";
    await tick();
    scroll()?.scrollTo(0, origin?.scroll ?? 0);
    if (origin?.search) searchScroll()?.scrollTo(0, origin.search.scroll);
    if (origin) document.querySelector<HTMLElement>(origin.selector)?.focus({ preventScroll: true });
    browserNavigation?.capture();
  }
  async function selectSearchResult(result: CatalogSearchResult) {
    if (result.kind === "record") {
      // The activated result owns the return target even when pointer activation
      // does not focus buttons (WebKit). Capture it before changing the place.
      document.querySelector<HTMLElement>(`[data-search-result="${result.id}"] button`)?.focus({ preventScroll: true });
      await event({ kind: "catalog.open", record: result.id }); return;
    }
    cancelSearch(); await tick();
    const target = result.kind === "bank" ? await bank?.revealEntry(result.id)
      : document.querySelector<HTMLElement>(`[data-place-stack="${result.id}"]`);
    if (target) revealSearchTarget(target, scroll());
  }
  async function navigate(destination: typeof active) {
    if (destination === active && viewState.selectedId === null) return;
    browserNavigation?.capture();
    if (destination === "bank") bankVisited = true;
    active = destination;
    cancelSearch(); opener = undefined;
    if (destination === "browse") viewState = reducePublicCatalog(definition, viewState, { kind: "catalog.back" });
    await tick(); scroll()?.scrollTo(0, 0);
    document.querySelector<HTMLElement>("[data-catalog-content]")?.focus({ preventScroll: true });
    browserNavigation?.push();
  }
  onMount(() => {
    const root = document.documentElement;
    const previous = root.dataset.rendererProfile;
    root.dataset.rendererProfile = "apple-reference";
    const location = new URL(window.location.href);
    const place = location.searchParams.get('place'), record = location.searchParams.get('record');
    if (place === 'bank' || (place === 'travel-kit' && definition.exercises)) active = place;
    bankVisited = active === 'bank';
    if (record && active === 'browse') {
      try { viewState = reducePublicCatalog(definition, viewState, { kind: 'catalog.open', record }); }
      catch { /* Unknown public record: retain the safe catalog home. */ }
    }
    browserNavigation = catalogHistory<Snapshot>(() => ({ active, state: viewState, opener, searching,
      query: searchQuery, scroll: scroll()?.scrollTop ?? 0, searchScroll: searchScroll()?.scrollTop ?? 0,
      focus: document.activeElement?.closest<HTMLElement>('[data-search-result]')
        ? `[data-search-result="${document.activeElement.closest<HTMLElement>('[data-search-result]')!.dataset.searchResult}"] button`
        : (document.activeElement as HTMLElement | null)?.dataset.catalogReturn
          ? `[data-catalog-return="${(document.activeElement as HTMLElement).dataset.catalogReturn}"]` : undefined }), async snapshot => {
      active = snapshot.active; viewState = snapshot.state; opener = snapshot.opener;
      bankVisited ||= active === 'bank'; searching = snapshot.searching; searchQuery = snapshot.query;
      await tick(); scroll()?.scrollTo(0, snapshot.scroll); searchScroll()?.scrollTo(0, snapshot.searchScroll);
      const target = snapshot.focus ? document.querySelector<HTMLElement>(snapshot.focus)
        : document.querySelector<HTMLElement>('[data-place-header] [data-place-title]');
      (target ?? scroll())?.focus({ preventScroll: true });
    }, snapshot => {
      const url = new URL(window.location.href);
      if (snapshot.active === 'browse') url.searchParams.delete('place'); else url.searchParams.set('place', snapshot.active);
      if (snapshot.active === 'browse' && snapshot.state.selectedId) url.searchParams.set('record', snapshot.state.selectedId);
      else url.searchParams.delete('record');
      return url.href;
    });
    return () => {
      browserNavigation?.dispose();
      if (previous === undefined) delete root.dataset.rendererProfile; else root.dataset.rendererProfile = previous;
    };
  });
</script>

<svelte:head><title>{definition.title} · DESERT</title></svelte:head>
<CatalogWorkspace productName={definition.title} title={scope.title} {identity} {navigation} {active} query={searchQuery} {searching}
  onquery={querySearch} onsearch={() => searching = true} oncancel={cancelSearch} onnavigate={navigate}
  detail={active === "browse" && viewState.selectedId !== null} onback={() => void event({ kind: "catalog.back" })}>
  {#snippet searchResults()}
    <CatalogSearchResults title={scope.title} description={scope.description} query={searchQuery} {results} onselect={selectSearchResult} />
  {/snippet}
  <div hidden={active !== "browse" || viewState.selectedId !== null}>
    <CatalogHome node={definition.home} onevent={event} bodyOnly />
  </div>
  {#if active === "browse" && view.content.kind === "catalog.detail"}<CatalogDetail node={view.content} onevent={event} bodyOnly />{/if}
  {#if definition.exercises}<RetainedPlace visible={active === "travel-kit"} active={active === "travel-kit" && !searching}><LocalExercises definition={definition.exercises} oncatalog={event} bodyOnly /></RetainedPlace>{/if}
  {#if bankVisited}<RetainedPlace visible={active === "bank"} active={active === "bank" && !searching}><PublicCatalogBank bind:this={bank} bind:query={bankQuery} surface={definition} oncatalog={event} bodyOnly /></RetainedPlace>{/if}
</CatalogWorkspace>
```

## src/svelte/explorer/LocalExercises.svelte

Source SHA-256: c8fc9893319a61ea28140f6aeee2dd1862aa1d49f1df391abb92cacdcc6668c2

```svelte
<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import type { PublicCatalogExercises } from "../../public-catalog/client.ts";
  import { reduceCatalogDraft } from "../../public-catalog/draft.ts";
  import PlaceContent from "../pieces/PlaceContent.svelte";
  import { LocalFileHost } from "../controls/file-host.ts";
  import type { BankEvent } from "../../interaction/bank-events.ts";
  import { stackNodes } from "../../interaction/place.ts";
  let { definition, bodyOnly = false, oncatalog }: {
    definition: PublicCatalogExercises; bodyOnly?: boolean; oncatalog?: (event: BankEvent) => void;
  } = $props();
  let draft = $state.raw(untrack(() => definition));
  const host = new LocalFileHost();
  $effect(() => {
    if (!oncatalog && definition.stacks.some(stack => stackNodes(stack.items).some(node => node.kind === 'catalog.card'))) {
      throw new Error('CATALOG_NAVIGATION_HOST_REQUIRED');
    }
  });
  onDestroy(() => host.dispose());
</script>

<div data-local-exercises>
  <PlaceContent definition={draft} {host} {bodyOnly} onevent={event => {
    if (event.kind === 'catalog.open') oncatalog?.(event);
    else draft = reduceCatalogDraft(draft, event);
  }} />
</div>
```

## src/svelte/explorer/CatalogCard.svelte

Source SHA-256: 5d369a6373d9c2b24a5769bc13b13f459159fa5934c46a1c928a9068ce031914

```svelte
<script lang="ts">
  import * as Card from "@desert/svelte/vendor/components/ui/card/index.js";
  import { Button } from "@desert/svelte/vendor/components/ui/button/index.js";
  import type { BankNodeFor } from "../../interaction/bank-node.ts";
  import type { BankEvent } from "../../interaction/bank-events.ts";
  import { getContext } from 'svelte';
  import Image from '../pieces/media/Image.svelte';
  import { mediaSource, prefetchImage } from '../pieces/media/source.ts';
  let { node, onevent }: { node: BankNodeFor<"catalog.card">; onevent: (event: BankEvent) => void } = $props();
  const cover = getContext<((record:string)=>string | undefined) | undefined>('catalog-photo-intent');
  function prepare() {
    const asset = cover?.(node.record); if (asset) prefetchImage(mediaSource(asset), window.innerWidth*window.devicePixelRatio);
  }
  const open = () => onevent({ kind: "catalog.open", record: node.record });
</script>

{#snippet media()}
  <Image source={mediaSource(node.image.asset)} alt={node.image.alt} />
{/snippet}

  <Card.Root data-catalog-card="item" data-record={node.record} data-public-card={node.record}>
    {@render media()}
    <Card.Header><Card.Title>
      <Button variant="row" data-catalog-image-action aria-label={node.title} onclick={open} onpointerenter={prepare} onfocus={prepare}>
        <span data-catalog-card-overlay data-catalog-item-title data-public-card-title>{node.title}</span>
      </Button>
    </Card.Title></Card.Header>
  </Card.Root>
```

## src/svelte/explorer/CatalogToolbar.svelte

Source SHA-256: 0cb7da1c2091556c30e9c61fe6f524aca1808766cc82a539d584f2b83882f53c

```svelte
<script lang="ts">
  import { tick, untrack } from "svelte";
  import * as Sidebar from "@desert/svelte/vendor/components/ui/sidebar/index.js";
  import * as Field from "@desert/svelte/vendor/components/ui/field/index.js";
  import { Button } from "@desert/svelte/vendor/components/ui/button/index.js";
  import ToolbarLayout from "../pieces/ToolbarLayout.svelte";
  import SearchField from "../pieces/SearchField.svelte";
  import Search from "@lucide/svelte/icons/search";
  import X from "@lucide/svelte/icons/x";
  let { title, query, onquery, searching, resultsId, onsearch, oncancel, searchAvailable = true }: {
    title: string; query: string; onquery: (query: string) => void; searching: boolean;
    resultsId: string; onsearch: () => void; oncancel: () => void; searchAvailable?: boolean;
  } = $props();
  const sidebar = Sidebar.useSidebar();
  const id = $props.id();
  let input = $state<HTMLInputElement | null>(null);
  let toggleButton = $state<HTMLButtonElement | null>(null);
  // Product cancellation may clear its query immediately. Retain only the
  // outgoing field's paint until the next opening; no stale search is executed.
  let displayedQuery = $state(untrack(() => query));
  $effect(() => { if (searching) displayedQuery = query; });
  async function toggle() {
    if (searching) { oncancel(); return; }
    onsearch(); await tick(); input?.focus({ preventScroll: true });
  }
</script>

{#snippet searchActions()}
  <div data-catalog-search-actions data-expanded={searching}>
  <Field.Field data-catalog-search inert={!searching} aria-hidden={!searching}>
    <Field.Label class="sr-only" for={id}>Search {title.toLowerCase()}</Field.Label>
    <SearchField {id} bind:ref={input} value={displayedQuery} onvalue={onquery} placeholder={`Search in ${title}`}
      aria-controls={searching ? resultsId : undefined} tabindex={searching ? undefined : -1} />
  </Field.Field>
  <Button bind:ref={toggleButton} variant="secondary" size="icon" data-catalog-search-toggle data-catalog-search-cancel={searching || undefined}
    aria-label={searching ? "Close search" : "Search"} title={searching ? "Close search" : "Search"}
    aria-expanded={searching} aria-controls={searching ? resultsId : undefined} onclick={toggle}>
    <Search data-search-icon="open" aria-hidden="true" /><X data-search-icon="close" aria-hidden="true" />
  </Button>
  </div>
{/snippet}

<!-- Search stays mounted when its edge changes, preserving composition and focus. -->
{#if searchAvailable}
<ToolbarLayout data-catalog-toolbar
  data-searching={searching} edge={sidebar.presentation === "overlay" ? "bottom" : "top"}>
  {@render searchActions()}
</ToolbarLayout>
{/if}
```

## src/svelte/explorer/PublicCatalogBank.svelte

Source SHA-256: 54abbcf90ae06df5ec1d480ba884259f3dbbf8c55da16ae472c1c780f6f45623

```svelte
<script lang="ts">
  import { tick } from "svelte";
  import * as Empty from "@desert/svelte/vendor/components/ui/empty/index.js";
  import type { BankEvent } from "../../interaction/bank-events.ts";
  import type { PrimitiveId } from "../../interaction/catalog.ts";
  import { catalogGroups, matchingEntries } from "../catalog/navigation.ts";
  import CatalogNavigation from "../catalog/CatalogNavigation.svelte";
  import CatalogGroupHeader from "../catalog/CatalogGroupHeader.svelte";
  import CatalogFoundations from "../catalog/CatalogFoundations.svelte";
  import ControlBench from "../catalog/ControlBench.svelte";
  import SpecimenGroup from "../catalog/SpecimenGroup.svelte";
  import SpecimenRow from "../catalog/SpecimenRow.svelte";
  import SpecimenUnavailable from "../catalog/SpecimenUnavailable.svelte";
  import PublicCatalogBankSpecimen from "./PublicCatalogBankSpecimen.svelte";
  import { publicCatalogBankInventory, type PublicBankInput } from "./PublicCatalogBank-model.ts";
  import PlaceHeader from "../pieces/PlaceHeader.svelte";
  let { surface, oncatalog, bodyOnly = false, query = $bindable("") }: {
    surface: PublicBankInput; oncatalog: (event: BankEvent) => void; bodyOnly?: boolean; query?: string;
  } = $props();
  let inventory = $derived(publicCatalogBankInventory(surface));
  let entries = $derived(matchingEntries(query));
  let visibleIds = $derived(entries.map(entry => entry.id));
  export async function revealEntry(id: PrimitiveId): Promise<HTMLElement | null> {
    if (!visibleIds.includes(id)) query = "";
    await tick();
    return document.querySelector<HTMLElement>(`[data-public-catalog-bank] [data-catalog-entry="${id}"]`);
  }
</script>

<section data-public-catalog-bank class="flex w-full min-w-0 max-w-[52rem] flex-col gap-8" aria-label="Component bank">
  {#if !bodyOnly}
  <PlaceHeader title="Component bank" subtitle="Interactive examples. Changes stay here; no product commands are executed." />
  {/if}
  <CatalogNavigation bind:query {entries} />
  {#each catalogGroups as group (group.id)}
    <section class="flex min-w-0 flex-col gap-8" aria-label={group.title} hidden={!group.entries.some(entry => visibleIds.includes(entry.id))}>
    <CatalogGroupHeader family={group.family} />
    {#if group.id === "foundations"}<CatalogFoundations />{/if}
    {#each group.entries.filter(entry => entry.family !== "control") as entry (entry.id)}
    <SpecimenGroup id={entry.id} hidden={!visibleIds.includes(entry.id)}>
      {#each inventory.filter(item => item.id === entry.id) as specimen (specimen.state)}
        <SpecimenRow id={entry.id} state={specimen.state} coverage={specimen.gap ? "gap" : "rendered"}>
          {#if specimen.node}<PublicCatalogBankSpecimen initial={specimen.node} {oncatalog} />
          {:else if specimen.gap}<SpecimenUnavailable reason={specimen.gap} />{/if}
        </SpecimenRow>
      {/each}
    </SpecimenGroup>
    {/each}
    <ControlBench entryIds={group.entries.filter(entry => entry.family === "control").map(entry => entry.id)} {visibleIds} />
    </section>
  {/each}
  {#if !entries.length}<Empty.Root><Empty.Header><Empty.Title>No matching components</Empty.Title>
    <Empty.Description>Try a component name, identifier or state.</Empty.Description></Empty.Header></Empty.Root>{/if}
</section>
```

## src/svelte/explorer/PublicCatalogBank-model.ts

Source SHA-256: ac68b660b8c32564b5c3ca436c33e93bf21254791aee70c657b25511d854c1fd

```ts
import { InteractionCatalog, type PrimitiveId } from "../../interaction/catalog.ts";
import { BankVersion as version, bankNode, type BankNode } from "../../interaction/bank-node.ts";
import { surfaceFrame, type FactsContent } from "../../interaction/surface-frame.ts";
import type { PublicCatalogSurface } from "../../public-catalog/index.ts";

export type PublicBankSpecimen = Readonly<{ id: PrimitiveId; state: string;
  owner: "bank" | "control-bank"; node?: BankNode; gap?: string }>;
export type PublicBankInput = Pick<PublicCatalogSurface, "productId" | "home" | "details">;

/** Diagnostic coverage is not a capability declaration or an execution adapter. */
export function publicCatalogBankInventory(surface: PublicBankInput): readonly PublicBankSpecimen[] {
  const first = surface.details[0]!;
  const details: FactsContent = { kind: "facts", object: surface.productId, fields: ["title"],
    labels: { [`${surface.productId}.title`]: "Title" }, facts: { title: first.title } };
  return InteractionCatalog.entries.flatMap(entry => entry.states.map(state => {
    const specimen = { id: entry.id, state, owner: "bank" as const };
    const render = (node: BankNode): PublicBankSpecimen => ({ ...specimen, node: bankNode(node) });
    const gap = (reason: string): PublicBankSpecimen => ({ ...specimen, gap: reason });
    if (entry.family === "control") return { ...specimen, owner: "control-bank" as const };
    if (entry.id === "catalog.home") return { ...specimen, node: surface.home };
    if (entry.id === "catalog.detail") return { ...specimen, node: first };
    if (entry.id === "catalog.card") return { ...specimen,
      node: state === "featured" ? surface.home.featured : surface.home.groups.flatMap(group => group.items)[0]! };
    if (entry.id === "input.text" || entry.id === "input.multiline") return render({ version, kind: entry.id,
      name: `${entry.id}-${state}`, label: "Local writing example", value: state === "value" ? "A thought worth keeping" : "",
      ...(entry.id === "input.multiline" && state === "value" ? { maxLength: 280 } : {}),
      required: true, disabled: state === "disabled", ...(state === "invalid" ? { error: "Example validation message; no product validator is connected." } : {}) });
    if (entry.id === "fact") return render({ version, kind: "fact", details: { ...details,
      facts: state === "known" ? details.facts : state === "empty" ? { title: "" } : {} } });
    if (entry.id === "action") return render({ version, kind: "action", role: "secondary", action: {
      intent: { kind: "specimen", operation: "press" }, label: "Diagnostic action", icon: "open",
      state: state === "pending" ? "pending" : state === "unavailable" ? "unavailable" : "ready" } });
    if (entry.id === "availability") return render({ version, kind: "availability",
      state: state === "ready" ? "ready" : state === "unknown" ? "unknown" : "unavailable",
      label: `Example: ${state}. No controller is connected.` });
    if (entry.id === "collection") return state === "empty"
      ? gap("An empty collection's create guidance requires an installed create journey. This read-only catalog has no create operation.")
      : render({ version, kind: "collection", object: surface.productId,
        fields: ["title"], labels: details.labels, createLabel: "Create", disabled: false, loaded: true,
        selectedId: null, records: surface.details.map(detail => ({ id: detail.record, version: 1, facts: { title: detail.title } })) });
    if (entry.id === "context") return state === "available"
      ? render({ version, kind: "context", content: { kind: "context", details, actions: [] } })
      : gap("Journey availability requires actual contract-derived offers. This public catalog supplies read-only context, not a controller.");
    if (entry.id === "form") return gap("A product form requires its command schema and submit journey. This public catalog has neither; local writing controls are shown separately.");
    if (entry.id === "review") return gap("Prepared effects and uncertain acceptance require an actual admitted operation. No acceptance or recovery is simulated here.");
    if (entry.id === "transient") return render({ version, kind: "transient", label: "Diagnostic transient", open: false,
      locked: state === "locked", frame: surfaceFrame({ version: "desert.surface-frame/6", kind: "message",
        top: { title: "Isolated transient" }, content: { kind: "message", text: state === "locked"
          ? "This diagnostic lock releases after three seconds. No product operation is running."
          : "Close returns to the component bank. No product state changes." }, bottom: {} }) });
    if (entry.id === "problem") return render({ version, kind: "problem", open: false, locked: false,
      title: state === "warning" ? "Example warning" : "Example error", severity: state === "warning" ? "warning" : "error",
      description: "An isolated message example. No product request failed." });
    throw new Error(`PUBLIC_BANK_COVERAGE_REQUIRED:${specimen.id}:${state}`);
  }));
}
```
