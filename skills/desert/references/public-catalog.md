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
- src/svelte/infra/media-source.ts
- src/svelte/catalog/foundations/image/Image.svelte
- src/svelte/catalog/compositions/photo-collection/PhotoCollection.svelte
- src/svelte/catalog/compositions/viewer/Viewer.svelte
- src/svelte/catalog/mechanisms/media-gestures/media-gestures.ts
- src/svelte/catalog/renderer/public-catalog-product/PublicCatalogProduct.svelte
- src/svelte/catalog/renderer/local-exercises/LocalExercises.svelte
- src/svelte/catalog/foundations/catalog-card/CatalogCard.svelte
- src/svelte/catalog/compositions/catalog-workspace/CatalogToolbar.svelte
- src/svelte/catalog/renderer/public-catalog-bank/PublicCatalogBank.svelte
- src/svelte/infra/PublicCatalogBank-model.ts

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

Source SHA-256: ace03342da5093d1c798ce3112d477529dade34a16913fbfbbc5c2bc5feedc22

```ts
import { controlResolvedNode } from "../../src/interaction/resolved-node.ts";
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
      controlResolvedNode({ ...base, kind: "select", id: "destination", label: "Destination", required: true, value: null,
        options: [option("1016", "Mount Fuji"), option("1017", "Wulingyuan"), option("1018", "Mount Everest")] }),
      controlResolvedNode({ ...base, kind: "date", id: "arrival", label: "Arrival date", required: false, value: null }),
    ] },
    { id: "notes", title: "Notes", items: [
      stackNode({ version: "desert.bank-node/1", kind: "input.multiline", name: "notes", label: "Things to remember", value: "", required: false, disabled: false }),
    ] },
    { id: "pace", title: "Travel pace", items: [
      controlResolvedNode({ ...base, kind: "options", id: "pace", label: "Travel pace", minSelected: 1, maxSelected: 1, selected: ["slow"],
        options: [option("slow", "Take it slowly"), option("active", "Keep exploring")] }),
    ] },
    { id: "interests", title: "Interests", items: [
      controlResolvedNode({ ...base, kind: "options", id: "activities", label: "Interests", minSelected: 0, maxSelected: 3, selected: [],
        options: [option("walking", "Walking"), option("photography", "Photography"), option("culture", "Culture")] }),
    ] },
    { id: "budget", title: "Budget", items: [
      controlResolvedNode({ ...base, kind: "money", id: "budget", label: "Estimated budget", required: false,
        currencies: [{ code: "USD", scale: 2 }, { code: "ARS", scale: 2 }, { code: "JPY", scale: 0 }], currency: "USD", minorUnits: null }),
    ] },
    { id: "essentials", title: "Travel documents", description: "Files stay on this device. Nothing is uploaded.", items: [
      controlResolvedNode({ ...base, kind: "files", id: "documents", label: "Travel documents", files: [],
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

Source SHA-256: 9aa68115b505c2c15a21c5bf412a39df71ebb8e31b583d8dc3e3b49d604f3c58

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
  if (Object.values(object.facts).some(fact => fact.kind === "asset")) throw new Error("PRIVATE_ASSET_REQUIRES_CONTROLLER_READ");
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

Source SHA-256: a2439a729083d513d55c1f9ec026287543f5893a6fd352cd62c896a8723f51ac

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
  if (!featuredDetail || !surface.home.featured.image || featuredDetail.title !== surface.home.featured.title ||
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

Source SHA-256: ff7a4ddc06019e1afc3cb26ac9d71db66beb5cc7812a2934f8899f00f1c560bd

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
const mediaCard = { record: LogicalIdSchema, title: nonemptyText(), image: Type.Optional(CatalogImageSchema),
  mediaType: Type.Union([Type.Literal("video"), Type.Literal("audio")]) };
const item = { presentation: Type.Literal("item") };
const featured = { presentation: Type.Literal("featured"), eyebrow: nonemptyText(), actionLabel: nonemptyText() };
export const CatalogItemSchema = Type.Union([
  node("catalog.card", { ...card, ...item }), node("catalog.card", { ...mediaCard, ...item }),
]);
export const CatalogFeaturedSchema = Type.Union([
  node("catalog.card", { ...card, ...featured }), node("catalog.card", { ...mediaCard, ...featured }),
]);
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

Source SHA-256: 4285006514f594514e26ac19949052ecf3cc854c641e8fda531483b84fabe881

```ts
import { resolvedNode } from "../interaction/resolved-node.ts";
import { PlaceContentSchema, placeContent, stackNodes, type PlaceContent } from "../interaction/place.ts";

export const PublicCatalogExercisesSchema = PlaceContentSchema;
export type PublicCatalogExercises = PlaceContent;

/** Local drafts are explicitly not controller commands, approvals, or durable accepted results. */
export function checkPublicCatalogExercises(exercises: PublicCatalogExercises, assets?: ReadonlySet<string>, records?: ReadonlySet<string>): void {
  placeContent(exercises);
  for (const stack of exercises.stacks) {
    for (const value of stackNodes(stack.items)) {
      const node = resolvedNode(value);
      if (node.kind === "catalog.card") {
        if (assets && node.image && !assets.has(node.image.asset)) throw new Error("INVALID_CATALOG_EXERCISE_ASSET_REFERENCE");
        if (records && !records.has(node.record)) throw new Error("INVALID_CATALOG_EXERCISE_RECORD_REFERENCE");
      } else if ("control" in node) {
        if (node.control.kind === "image" || node.control.kind === "avatar") {
          if (typeof node.control.source === "string") throw new Error("INVALID_CATALOG_EXERCISE_HOST_MEDIA");
          if (node.control.source !== null && !("asset" in node.control.source)) throw new Error("CATALOG_PRIVATE_MEDIA_FORBIDDEN");
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

Source SHA-256: 79bbeef1ef37e42e763e0ff14650507c3c604ff06ea698eabc5496cbd3b98bba

```ts
import { nodeEvent } from "../interaction/node-events.ts";
import { controlResolvedNode } from "../interaction/resolved-node.ts";
import { applyControlEvent } from "../interaction/control-nodes.ts";
import { freezeDeep } from "../json.ts";
import { checkPublicCatalogExercises, type PublicCatalogExercises } from "./exercises.ts";
import { stackNode, type StackNode } from "../interaction/place.ts";

/** Local session state only. No admission, persistence, controller command or success receipt. */
export function reduceCatalogDraft(current: PublicCatalogExercises, input: unknown): PublicCatalogExercises {
  checkPublicCatalogExercises(current);
  const event = nodeEvent(input);
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
      return stackNode(controlResolvedNode(applyControlEvent(node.control, event).node));
    }
    return node;
  }
  const stacks = current.stacks.map(stack => ({ ...stack, items: stack.items.map(update) }));
  if (!matched) throw new Error("UNKNOWN_DRAFT_TARGET");
  return freezeDeep({ ...current, stacks });
}
```

## src/public-catalog/capabilities.ts

Source SHA-256: 9625057d326725322b7d1712cc6c85bbd1ceec21ddbb8e08e12ebff56bdf24d5

```ts
import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { closedObject, nonemptyText } from "./node-schema.ts";
import type { ResolvedNode } from "../interaction/resolved-node.ts";
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
export function publicCatalogRequirements(nodes: readonly ResolvedNode[] = [], gallery = false): RendererRequirements {
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

Source SHA-256: b1f4c74de116b1ff4f1d86a793630cdc09f8739b2806ce0d8e50ede6536eb460

```ts
import { mkdirSync, cpSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import type { CompiledPublicCatalog } from "../../public-catalog/index.ts";
import { createBuildProject } from "../svelte/project.ts";
import { rendererRevision } from "../svelte/revision.ts";
import { fileInventory } from "../files.ts";
import { bindCatalogAssets } from "./assets.ts";
import { catalogBuildFile, publicCatalogBuildFormat, type PublicCatalogBuild } from "./manifest.ts";
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
    const { gate } = await project.run("build");
    if (rendererRevision() !== revision) throw new Error("BUILDER_CHANGED_DURING_BUILD");
    mkdirSync(dirname(output), { recursive: true });
    mkdirSync(output); ownsOutput = true;
    cpSync(join(project.directory, "build"), join(output, "web"), { recursive: true });
    writeFileSync(join(output, "package.json"), JSON.stringify({ private: true, type: "module" }));
    writeFileSync(join(output, "surface.json"), JSON.stringify(application.surface, null, 2) + "\n");
    writeFileSync(join(output, "schemas.json"), JSON.stringify(publicCatalogSchemas(), null, 2) + "\n");
    const manifest: PublicCatalogBuild = {
      format: publicCatalogBuildFormat, gate, productId: application.id, contractDigest: application.digest,
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

Source SHA-256: 1ce4266405d81ca51df9e6523f7048323482e36e4688744c0f8d963b2f63d055

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
import { gateVersion, requireGateEvidence } from "../qualification.ts";

export const catalogBuildFile = "PUBLIC-CATALOG-BUILD.json";
/** /2 adds the evidence of the catalog gate that let the build run (plan 3.5), as distribution builds do. */
export const publicCatalogBuildFormat = "desert.public-catalog-build/2";
const sha = Type.String({ pattern: "^[a-f0-9]{64}$" });
const closed = { additionalProperties: false };
const schema = Type.Object({
  format: Type.Literal(publicCatalogBuildFormat), gate: Type.Object({ version: Type.Literal(gateVersion) }, closed),
  productId: LogicalIdSchema, contractDigest: sha,
  rendererRevision: sha, mode: Type.Literal("public-read-only"), mediaPolicy: Type.Literal("external-local-bindings"),
  assets: Type.Array(Type.Object({ id: LogicalIdSchema, digest: sha, size: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
    mediaType: Type.Union([...new Set(Object.values(catalogMediaTypes))].map(type => Type.Literal(type))) }, closed), { minItems: 1 }),
  files: Type.Record(Type.String(), sha),
}, closed);
export type PublicCatalogBuild = Static<typeof schema>;

export function loadPublicCatalogBuild(directory: string) {
  const files = fileInventory(directory, [catalogBuildFile]);
  const value: unknown = JSON.parse(readFileSync(join(directory, catalogBuildFile), "utf8"));
  requireGateEvidence(value, publicCatalogBuildFormat, "catalog build");
  if (!Check(schema, value)) throw new Error("INVALID_PUBLIC_CATALOG_BUILD");
  if (digest(value.files) !== digest(files)) throw new Error("BUILD_FILES_MISMATCH");
  if (!Object.hasOwn(files, "surface.json") || !Object.hasOwn(files, "web/handler.js")) throw new Error("INVALID_PUBLIC_CATALOG_BUILD");
  const surface = publicCatalogSurface(JSON.parse(readFileSync(join(directory, "surface.json"), "utf8")));
  if (value.productId !== surface.productId || value.contractDigest !== surface.digest) throw new Error("BUILD_SURFACE_MISMATCH");
  const identities = new Set(value.assets.map(asset => asset.id));
  if (identities.size !== value.assets.length) throw new Error("INVALID_PUBLIC_CATALOG_BUILD");
  const references = [...(surface.home.featured.image ? [surface.home.featured.image.asset] : []),
    ...surface.details.map(detail => detail.image.asset),
    ...surface.home.groups.flatMap(group => group.items.flatMap(item => item.image ? [item.image.asset] : []))];
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
    if (node.kind === "catalog.card" && node.image) references.push(node.image.asset);
    if ("control" in node && (node.control.kind === "image" || node.control.kind === "avatar") &&
        node.control.source !== null && typeof node.control.source !== "string") {
      if (!("asset" in node.control.source)) throw new Error("CATALOG_PRIVATE_MEDIA_FORBIDDEN");
      references.push(node.control.source.asset);
    }
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

Source SHA-256: 989816d76a4c265df6980906d0b1505f6e14e81ee64b1b878a21ae744790ae6a

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
  ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".ogg": "audio/ogg", ".wav": "audio/wav", ".vtt": "text/vtt",
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

Source SHA-256: e51f82b2866075d608e2eeea889006a4d6309b8631a2da0c01974ba11c1efab1

```ts
import sharp from 'sharp';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hash } from '../files.ts';
import type { BoundCatalogAsset } from './assets.ts';
import { renditionWidths, imageInputPixelLimit } from '../../media/rendition-policy.ts';
export { renditionWidths } from '../../media/rendition-policy.ts';

const recipe = `webp-q82-alpha100-effort4-srgb-auto-orient-v1-${sharp.versions.sharp}-${sharp.versions.vips}`;
const cache = join(tmpdir(), 'desert-media-renditions-v1');
export type Rendition = { bytes: Buffer; size: number; mediaType: string; digest: string };

/** Decode at build/host preparation, not while handling display requests. Originals are immutable. */
export async function createRendition(bytes: Buffer, edge: number): Promise<Buffer> {
  if (!(renditionWidths as readonly number[]).includes(edge)) throw new Error('INVALID_MEDIA_RENDITION_SIZE');
  return sharp(bytes, { limitInputPixels: imageInputPixelLimit }).autoOrient()
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

## src/svelte/infra/media-source.ts

Source SHA-256: 3047cd0fd96364afd660b329653439ee42f9f72e3525165c3ca3ce96aaea2cfb

```ts
import type { MediaItem } from '../../views/media-library.ts';
import type { AssetReference } from '../../assets/types.ts';
import type { Static } from '@sinclair/typebox';
import type { Frozen } from '../../json.ts';
import type { ViewerMediaSchema } from './viewer-media.ts';
export type ImageSource = string | AssetReference;
export type Photo = Readonly<{ source: ImageSource; alt: string }>;
/** One image, video or audio item of a viewer: the static type of the closed ViewerMediaSchema. */
export type ViewerMedia = Frozen<Static<typeof ViewerMediaSchema>>;
export const mediaSource = (asset: string) => `/media/${encodeURIComponent(asset)}`;
export const imageIdentity = (source: ImageSource) => typeof source === 'string' ? source : `private:${source.reference}`;
export const catalogPhotos = (images: readonly { asset: string; alt: string }[]): Photo[] =>
  images.map(image => ({ source: mediaSource(image.asset), alt: image.alt }));
export const viewerMedia = (items: readonly MediaItem[]): ViewerMedia[] => items.map(item => item.kind === 'image'
  ? { kind: 'image', source: mediaSource(item.image.asset), alt: item.image.alt }
  : { kind: item.kind, source: mediaSource(item.source.asset), alt: item.title,
      ...(item.artwork ? { artwork: { source: mediaSource(item.artwork.asset), alt: item.artwork.alt } } : {}),
      captions: (item.captions ?? []).map(track => ({ ...track, source: mediaSource(track.asset) })) });
export function imageSource(source: string, edge: number) {
  if (!/^\/media\/[^/?#]+$/.test(source) || source.endsWith(".svg")) return source;
  const bucket = [160, 320, 640, 1280, 1920, 2560].find(size => size >= edge) ?? 2560;
  return `${source}?w=${bucket}`;
}

const pending = new Set<string>(), decoded = new Map<string, HTMLImageElement>();
let active = 0;
/** Intent/neighbor warming only: at most two requests, four queued, eight decoded photos. */
export function prefetchImage(source: ImageSource, edge: number) {
  if (typeof source !== 'string' || !source.startsWith('/media/')) return;
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

## src/svelte/catalog/foundations/image/Image.svelte

Source SHA-256: 0506b474c1662902287c5166dfe4eacf5507f40eca7c6cbb8a39b95ca2e9030f

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Action, Icon } from '../../index.ts';
  import { imageSource, imageIdentity } from '../../../infra/media-source.ts';
  import { usePrivateImages } from '../../../infra/private-image-context.ts';
  import { privateImageResource } from '../../../infra/private-image-resource.ts';
  import { renditionWidths } from '../../../../media/rendition-policy.ts';
  import type { CatalogProps } from "../../types.d.ts";
  let { source, alt = "", edge = 640, zoom = 1, retry = false, fit = 'fill', backdrop = 'muted', placeholder, onready, onunavailable,
    fallback = 'Image unavailable' }: CatalogProps<"image"> = $props();
  let host!: HTMLDivElement;
  let measured = $state(0), attempt = $state(0), ready = $state(''), failed = $state('');
  let original = $state('');
  let privateURL = $state<string | undefined>(), privateReference = $state<string | undefined>(), privateFailed = $state(false), privateRevision = $state(0);
  const resource = privateImageResource(usePrivateImages(),
    () => { privateURL = resource.url; privateReference = resource.reference; privateFailed = resource.failed; privateRevision = resource.revision; });
  const requestedEdge = $derived((measured || edge) * zoom);
  const variant = $derived(renditionWidths.find(width => width >= requestedEdge) ?? 2560);
  const sourceIdentity = $derived(source === undefined ? '' : imageIdentity(source));
  const url = $derived(source === undefined ? undefined : typeof source === 'string'
    ? original === source ? source : imageSource(source, requestedEdge)
    : privateReference === source.reference ? privateURL : undefined);
  const privateError = $derived(typeof source === 'object' && privateReference === source.reference && privateFailed);
  $effect(() => {
    const asset = source, rendition = variant; attempt;
    if (typeof asset !== 'object') { resource.clear(); return; }
    void resource.load(asset, rendition);
  });
  onDestroy(() => resource.dispose());
  // A new asset gets a new DOM image immediately. A larger rendition of the SAME
  // asset keeps its decoded pixels while loading, so pinch/resize never flashes.
  const identity = $derived(`${sourceIdentity}|${typeof source === 'object' ? privateRevision : 0}|${attempt}`);
  const status = $derived(placeholder ? 'placeholder' : failed === identity || privateError ? 'error' : url && ready === identity ? 'ready' : 'loading');
  $effect(() => { if (status === 'error') onunavailable?.(); });
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
    if (typeof source === 'string' && url !== source) { original = source; return; }
    failed = key;
  }
</script>

<!-- A placeholder keeps the artwork placeholder mark, so hosts that have not migrated still place it as they placed
     ArtworkPlaceholder. -->
<div bind:this={host} class={placeholder === undefined ? "image" : "image-placeholder"} class:image-clear={backdrop === 'none'}
  data-media-image={placeholder === undefined ? "" : undefined} data-media-artwork-placeholder={placeholder === undefined ? undefined : ""}
  data-image-fit={placeholder === undefined ? fit : undefined} data-image-state={status} data-image-placeholder={placeholder}
  aria-label={placeholder === 'audio' ? 'No cover artwork' : placeholder === 'video' ? 'No video poster' : undefined}>
  {#if placeholder === 'audio'}<Icon name="music-2" size="artwork" decorative />
  {:else if placeholder === 'video'}<Icon name="film" size="artwork" decorative />
  {:else if placeholder === 'unavailable'}{fallback}
  {:else}
    {#key identity}
      {@const key = identity}
      {#if url}<img class="image-element" class:image-contain={fit === 'fit'} src={url} {alt} decoding="async" draggable="false"
        style:visibility={ready === key && failed !== key && !privateError ? 'visible' : 'hidden'}
        onload={event => { if (event.currentTarget instanceof HTMLImageElement) void loaded(event.currentTarget, key); }} onerror={() => error(key)} />
      {/if}
    {/key}
    {#if status === 'error'}
      <div class="image-error" data-media-error role="img" aria-label={alt}>
        <span>{fallback}</span>
        {#if retry}<Action label="Retry" icon="retry" emphasis="secondary" face="text" state="ready" type="button" onclick={() => { original = ''; attempt++; }} />{/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  /* The components layer, as media.css was unlayered: a contextual rule of a host that has not migrated (a viewer
     stage, a catalog card) still outranks this base geometry. */
  @layer components {
    .image { position:relative; width:100%; height:100%; overflow:hidden; background:var(--muted); }
    .image-clear { background:transparent; }
    .image-placeholder { display:grid; place-items:center; width:100%; height:100%; background:var(--muted); color:var(--muted-foreground); }
    .image-element { display:block; width:100%; height:100%; object-fit:cover; user-select:none; }
    .image-contain { object-fit:contain; }
    .image[data-image-state="ready"] > .image-element { animation:image-in var(--dur-unfold) var(--ease-tm) both; }
    .image-error { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; color:var(--foreground); }
  }
  @keyframes image-in { from { opacity:0; } to { opacity:1; } }
  @media(prefers-reduced-motion:reduce) { .image[data-image-state="ready"] > .image-element { animation:none; } }
</style>
```

## src/svelte/catalog/compositions/photo-collection/PhotoCollection.svelte

Source SHA-256: 68263e4303278aabe6c18000e890b2a8c3fd5225f4d177422eca0608057da270

```svelte
<script lang="ts">
  import { Image } from '../../index.ts';
  import { Viewer } from '../../index.ts';
  import { mediaGestures } from '../../../infra/gestures.ts';
  import { prefetchImage, imageIdentity } from '../../../infra/media-source.ts';
  import type { CatalogProps } from '../../types.d.ts';
  let { photos, title, header = false, fit = 'fill' }: CatalogProps<'photo-collection'> = $props();
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
  <Image source={selected.source} alt={selected.alt} edge={header ? 1280 : 640} {fit} retry />
  <button type="button" bind:this={opener} use:drag data-media-open aria-label="Open photo viewer"
    onclick={() => open=true} onkeydown={key}></button>
  {#if photos.length>1}
    <div data-media-dots aria-label="Choose photo">
      {#each photos as photo, i (`${i}:${imageIdentity(photo.source)}`)}
        <button type="button" aria-label={`Photo ${i+1}: ${photo.alt}`} aria-current={i===index ? 'true' : undefined}
          onclick={() => select(i)}></button>
      {/each}
    </div>
  {/if}
</div>
{#if open}
  <Viewer items={photos.map(photo => ({kind:'image', ...photo}))} {title} {index} {open}
    onindex={value => index=value} onopen={value => open=value} onreturn={() => opener?.focus({ preventScroll:true })} />
{/if}
```

## src/svelte/catalog/compositions/viewer/Viewer.svelte

Source SHA-256: b960a75e7b8d51d4af1ac9238d0278e9e2e5f02250b3d390617fcd87fb7df9bc

```svelte
<script lang="ts">
  import * as Dialog from '../../../vendor/components/ui/dialog/index.js';
  import { Button } from '../../../vendor/components/ui/button/index.js';
  import { Icon } from '../../index.ts';
  import { ToolbarLayout } from '../../index.ts';
  import { Image } from '../../index.ts';
  import { PlaybackCanvas } from '../../index.ts';
  import { mediaPlayback } from '../../../infra/playback.svelte.ts';
  import { mediaGestures } from '../../../infra/gestures.ts';
  import { imageIdentity } from '../../../infra/media-source.ts';
  import type { CatalogProps } from '../../types.d.ts';
  let { items, title, index, open, onindex, onopen, onreturn }: CatalogProps<"viewer"> = $props();
  let scale = $state(1);
  let closeButton = $state<HTMLButtonElement | null>(null);
  let gesture: ReturnType<typeof mediaGestures> | undefined;
  const selected = $derived(items[index]!);
  const playback = mediaPlayback();
  function select(next: number) { playback.stop(); onindex?.(Math.max(0,Math.min(items.length-1,next))); gesture?.reset(); }
  function changeOpen(value: boolean) { if (!value) playback.stop(); onopen?.(value); }
  function manipulate(element: HTMLDivElement) {
    gesture=mediaGestures(element,{ image:()=>element.querySelector('img'),
      page:direction=>select(index+direction), canPage:()=>items.length>1, zoomable:selected.kind === 'image', onzoom:value=>scale=value });
    return { destroy:()=>gesture?.destroy() };
  }
  function key(event: KeyboardEvent) {
    if ((event.target as HTMLElement).closest('input,[role="slider"],[data-media-thumbs]')) return;
    if (event.key==='ArrowRight' || event.key==='ArrowLeft') {
      event.preventDefault(); if (scale===1) select(index+(event.key==='ArrowRight'?1:-1));
    } else if (event.code === 'Space' && selected.kind !== 'image' && !(event.target as HTMLElement).closest('button')) { event.preventDefault(); void playback.toggle(); }
    else if (selected.kind === 'image' && (event.key==='+' || event.key==='=')) { event.preventDefault(); gesture?.zoom(scale+1); }
    else if (selected.kind === 'image' && event.key==='-') { event.preventDefault(); gesture?.zoom(scale-1); }
    else if (selected.kind === 'image' && event.key==='0') { event.preventDefault(); gesture?.reset(); }
  }
</script>

<Dialog.Root {open} onOpenChange={changeOpen}>
  <Dialog.Content presentation="media" showCloseButton={false} data-media-viewer
    onOpenAutoFocus={event=>{ event.preventDefault(); closeButton?.focus({preventScroll:true}); }}
    onCloseAutoFocus={event=>{ event.preventDefault(); onreturn?.(); }} onkeydown={key}>
    <ToolbarLayout identity={{title,subtitle:`${index+1} / ${items.length}`}} identityRole="dialog"
      oncloseElement={element=>closeButton=element}
      content={{kind:"media-header",close:()=>changeOpen(false),zoom:selected.kind === 'image'
        ? {scale,onzoom:value=>gesture?.zoom(value),onreset:()=>gesture?.reset()} : undefined}} />
    <Dialog.Description class="sr-only">Swipe or use arrows to change media. Pinch, double-click or use plus and minus to zoom images. Space plays or pauses audio and video. Escape closes the viewer.</Dialog.Description>
    {#key `${index}:${imageIdentity(selected.source)}`}
    <div use:manipulate data-media-stage>
      {#if selected.kind === 'image'}<Image source={selected.source} alt={selected.alt} edge={1920} zoom={scale} retry onready={()=>gesture?.refresh()} />
      {:else}<PlaybackCanvas item={selected} {playback} />{/if}
      {#if items.length>1}
        <Button data-media-prev variant="secondary" size="icon-lg" aria-label="Previous media" disabled={index===0 || scale>1} onclick={()=>select(index-1)}><Icon name="chevron-left" /></Button>
        <Button data-media-next variant="secondary" size="icon-lg" aria-label="Next media" disabled={index===items.length-1 || scale>1} onclick={()=>select(index+1)}><Icon name="chevron-right" /></Button>
      {/if}
    </div>
    {/key}
    {#if items.length>1 || selected.kind !== 'image'}
      <ToolbarLayout content={{kind:"media-controls",items,index,onindex:select,playback}} />
    {/if}
  </Dialog.Content>
</Dialog.Root>
```

## src/svelte/catalog/mechanisms/media-gestures/media-gestures.ts

Source SHA-256: 9879f6ab1953e091ff4fe000fab4842cc61005e7403f8c593c5e25e24cc23b21

```ts
// Mechanism media-gestures: the pointer gestures of one media surface. A horizontal swipe pages, a pinch, a double-click
// or ctrl-wheel zooms the image, a drag pans it while zoomed; vertical drags stay native scrolling.
export const maximumMediaZoom = 4;

type Options = {
  image: () => HTMLImageElement | null; page: (direction: number) => void;
  canPage: () => boolean; zoomable?: boolean; onzoom?: (scale: number) => void;
  /** Pointer downs on these targets stay theirs (a player's controls inside the surface). */
  ignore?: (target: Element) => boolean;
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
  function zoom(value: number) { scale = clamp(value, 1, maximumMediaZoom); if (scale === 1) x = y = 0; paint(); }
  function distance() { const [a,b] = [...points.values()]; return a && b ? Math.hypot(a.x-b.x, a.y-b.y) : 1; }
  function down(e: PointerEvent) {
    const target = e.target instanceof Element ? e.target : null;
    if (e.button !== 0 || target && (target.closest('button') && !target.closest('[data-media-open]') || options.ignore?.(target))) return;
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

## src/svelte/catalog/renderer/public-catalog-product/PublicCatalogProduct.svelte

Source SHA-256: 5e9565947fc873e6cfcdecc2d9874afadbf1e423260523aff03c443136d066fd

```svelte
<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { PublicCatalogProductContent } from "../../index.ts";
  let { surface }: CatalogProps<"public-catalog-product"> = $props();
</script>

<PublicCatalogProductContent {surface} />
```

## src/svelte/catalog/renderer/local-exercises/LocalExercises.svelte

Source SHA-256: 1e20f01d45949b10db016b064f59258fbc18e24af4ddb974a44c7cb6812ec77b

```svelte
<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { LocalExerciseContent } from "../../index.ts";
  let { definition, bodyOnly = false, oncatalog }: CatalogProps<"local-exercises"> = $props();
</script>

<LocalExerciseContent {definition} {bodyOnly} {oncatalog} />
```

## src/svelte/catalog/foundations/catalog-card/CatalogCard.svelte

Source SHA-256: 8c6c7ac95370af17c79fa0a2e481e19d3a55fd261a212d22f0ac0015f043425b

```svelte
<script lang="ts">
  import * as Card from "@desert/svelte/vendor/components/ui/card/index.js";
  import { Button } from "@desert/svelte/vendor/components/ui/button/index.js";
  import type { CatalogProps } from "../../types.d.ts";
  import { getContext } from 'svelte';
  import { Image } from '../../index.ts';
  import { mediaSource, prefetchImage } from '../../../infra/media-source.ts';
  import { useFocusScope } from '../../../infra/focus-scope.ts';
  let { node, onevent }: CatalogProps<"catalog-card"> = $props();
  const cover = getContext<((record:string)=>string | undefined) | undefined>('catalog-photo-intent');
  function prepare() {
    const asset = cover?.(node.record); if (asset) prefetchImage(mediaSource(asset), window.innerWidth*window.devicePixelRatio);
  }
  const open = () => onevent?.({ kind: "catalog.open", record: node.record });
  // The card answers to `catalog-return:<record>` in the nearest focus scope, so what it opened can return focus to it.
  const scope = useFocusScope();
  let action = $state<HTMLElement | null>(null);
  $effect(() => {
    const target = action, key = `catalog-return:${node.record}`;
    if (!scope || !target) return;
    return scope.register(key, () => { target.focus({ preventScroll: true }); return document.activeElement === target; });
  });
</script>

  <Card.Root data-catalog-card="item" data-record={node.record} data-public-card={node.record}>
    {#if node.image}<Image source={mediaSource(node.image.asset)} alt={node.image.alt} />
    {:else if 'mediaType' in node}<Image placeholder={node.mediaType} />{/if}
    <Card.Header><Card.Title>
      <Button bind:ref={action} variant="row" data-catalog-image-action aria-label={node.title} onclick={open} onpointerenter={prepare} onfocus={prepare}>
        <span data-catalog-card-overlay data-catalog-item-title data-public-card-title>{node.title}</span>
      </Button>
    </Card.Title></Card.Header>
  </Card.Root>
```

## src/svelte/catalog/compositions/catalog-workspace/CatalogToolbar.svelte

Source SHA-256: d9f7a7276785de44f6cd1eda8451b1a1cce4f82c0f61e49bc956a339ab561c04

```svelte
<script lang="ts">
  import { ToolbarLayout } from "../../index.ts";
  let { title, query, onquery, searching, resultsId, onsearch, oncancel, searchAvailable = true }: {
    title: string; query: string; onquery: (query: string) => void; searching: boolean;
    resultsId: string; onsearch: () => void; oncancel: () => void; searchAvailable?: boolean;
  } = $props();
</script>

{#if searchAvailable}
  <ToolbarLayout layer="search" {searching} edge="top"
    content={{kind:"search",title,query,onquery,searching,resultsId,onsearch,oncancel}} />
{/if}
```

## src/svelte/catalog/renderer/public-catalog-bank/PublicCatalogBank.svelte

Source SHA-256: 7426cd9789988392ffcaddb67a91ba9087b7c0d840835cc9ed5c7158a13418aa

```svelte
<script lang="ts">
  import type { ResolvedNodeId } from "../../../../interaction/catalog.ts";
  import { InspectionCatalog } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { surface, oncatalog, bodyOnly, onactions }: CatalogProps<"public-catalog-bank"> = $props();
  let content = $state<{ revealEntry: (id: ResolvedNodeId) => Promise<HTMLElement | null>;
    revealAndFocusEntry: (id: ResolvedNodeId) => Promise<void> }>();
  export async function revealEntry(id: ResolvedNodeId) { return await content?.revealEntry(id) ?? null; }
  $effect(() => {
    const register = onactions;
    register?.({ revealEntry: async id => { await content?.revealAndFocusEntry(id); }, selectMedia: () => false });
    return () => register?.(null);
  });
</script>

<InspectionCatalog {surface} oncatalog={event => oncatalog?.(event)} {bodyOnly} bind:this={content} />
```

## src/svelte/infra/PublicCatalogBank-model.ts

Source SHA-256: f4cc2350887f3d10b615302c2b751c8502615605ff8e04721842b89b0011f2a6

```ts
import { ResolvedNodes, type ResolvedNodeId } from "../../interaction/catalog.ts";
import { ResolvedNodeVersion as version, resolvedNode, type ResolvedNode } from "../../interaction/resolved-node.ts";
import { surfaceFrame, type FactsContent } from "../../interaction/surface-frame.ts";
import type { PublicCatalogSurface } from "../../public-catalog/index.ts";

export type PublicBankSpecimen = Readonly<{ id: ResolvedNodeId; state: string;
  owner: "bank" | "control-bank"; node?: ResolvedNode; gap?: string }>;
export type PublicBankInput = Pick<PublicCatalogSurface, "productId" | "home" | "details">;

/** Diagnostic coverage is not a capability declaration or an execution adapter. */
export function publicCatalogBankInventory(surface: PublicBankInput): readonly PublicBankSpecimen[] {
  const first = surface.details[0]!;
  const details: FactsContent = { kind: "facts", object: surface.productId, fields: ["title"],
    labels: { [`${surface.productId}.title`]: "Title" }, facts: { title: first.title } };
  return ResolvedNodes.entries.flatMap(entry => entry.states.map(state => {
    const specimen = { id: entry.id, state, owner: "bank" as const };
    const render = (node: ResolvedNode): PublicBankSpecimen => ({ ...specimen, node: resolvedNode(node) });
    const gap = (reason: string): PublicBankSpecimen => ({ ...specimen, gap: reason });
    if (entry.family === "control") return { ...specimen, owner: "control-bank" as const };
    if (entry.id === "catalog.home") return { ...specimen, node: surface.home };
    if (entry.id === "catalog.detail") return { ...specimen, node: first };
    if (entry.id === "catalog.card") return { ...specimen,
      node: state === "featured" ? surface.home.featured : surface.home.groups.flatMap(group => group.items)[0]! };
    if (entry.id === "input.text" || entry.id === "input.multiline") return render({ version, kind: entry.id,
      name: `${entry.id}-${state}`, label: "Local writing example", value: state === "value" || state === "offline" ? "A thought worth keeping" : "",
      helper: state === "offline" ? "Keep editing this local draft while offline. Saving requires reconnection."
        : state === "loading" ? "Waiting for the controller to provide this operation’s inputs."
        : "Write a short thought. This helper belongs to the input, not the surrounding page.",
      ...(entry.id === "input.multiline" && state === "value" ? { maxLength: 280 } : {}),
      required: true, disabled: state === "disabled" || state === "loading", ...(state === "invalid" ? { error: "Example validation message; no product validator is connected." } : {}) });
    if (entry.id === "fact") return render({ version, kind: "fact", details: { ...details,
      facts: state === "known" ? details.facts : state === "empty" ? { title: "" } : {} } });
    if (entry.id === "action") return render({ version, kind: "action", role: "secondary", action: {
      intent: { kind: "specimen", operation: "press" }, label: "Diagnostic action", icon: "open",
      state: state === "pending" || state === "loading" ? "pending" : state === "unavailable" || state === "offline" ? "unavailable" : "ready",
      ...(state === "loading" ? {reason:"Connecting to the controller…"} : state === "offline" ? {reason:"Offline. Reconnect to use this action."} : {}) } });
    if (entry.id === "availability") return render({ version, kind: "availability",
      state: state === "ready" ? "ready" : state === "unknown" ? "unknown" : "unavailable",
      label: `Example: ${state}. No controller is connected.` });
    if (entry.id === "collection" && (state === "loading" || state === "offline")) return render({version,kind:"collection",object:surface.productId,
      fields:["title"],labels:details.labels,disabled:true,loaded:state==="offline",connection:state,selectedId:null,
      records:state==="loading"?[]:surface.details.map(detail=>({id:detail.record,version:1,facts:{title:detail.title}}))});
    if (entry.id === "collection" && state === "state-summary") return render({ version, kind: "collection", object: "task-specimen",
      fields: ["title", "status"], labels: { "task-specimen.title": "Title", "task-specimen.status": "Status" },
      valueLabels: { status: { open: "Open", completed: "Completed" } }, loaded: true, disabled: false, selectedId: null,
      records: [{ id: "open", version: 1, facts: { title: "Review the visual bank", status: "open" } },
        { id: "done", version: 1, facts: { title: "Verify grouped rows", status: "completed" } }] });
    if (entry.id === "collection" && (state === "media-grid" || state === "media-list")) return render({ version, kind: "collection", object: "media-specimen",
      fields: ["image"], labels: { "media-specimen.image": "Image" }, loaded: true, disabled: false, selectedId: null,
      presentation: { kind: "media-grid", image: "image", layout: state === "media-list" ? "list" : "grid" },
      records: [1, 2, 3].map(index => ({ id: `image-${index}`, version: 1, facts: { image: "/bank-image.svg" } })) });
    if (entry.id === "collection" && state === "collection-grid") return render({ version, kind: "collection", object: "collection-specimen",
      fields: ["title"], labels: { "collection-specimen.title": "Title" }, loaded: true, disabled: false, selectedId: null,
      presentation: { kind: "collection-grid", title: "title", previews: [{ id: "travel", count: 3,
        media: { kind: "asset", reference: "a7000000-0000-4000-8000-000000000001" } }, { id: "empty", count: 0 }] },
      records: [{ id: "travel", version: 1, facts: { title: "Travel" } }, { id: "empty", version: 1, facts: { title: "Research" } }] });
    if (entry.id === "collection") return state === "empty"
      ? gap("An empty collection's create guidance requires an installed create journey. This read-only catalog has no create operation.")
      : render({ version, kind: "collection", object: surface.productId,
        fields: ["title"], labels: details.labels, createLabel: "Create", disabled: false, loaded: true,
        selectedId: null, records: surface.details.map(detail => ({ id: detail.record, version: 1, facts: { title: detail.title } })) });
    if (entry.id === "context" && state === "media-object") return render({ version, kind: "context", content: {
      kind: "context", actions: [], presentation: { kind: "media-object", media: "image", description: "description" },
      details: { kind: "facts", object: "media-specimen", fields: ["image", "description"], images: ["image"], multiline: ["description"],
        labels: { "media-specimen.image": "Image", "media-specimen.description": "Description" },
        facts: { image: { kind: "asset", reference: "a7000000-0000-4000-8000-000000000001" }, description: "An isolated image example. Original proportions are preserved." } } } });
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
