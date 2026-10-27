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
  if (Object.values(object.facts).some(fact => fact.kind === "file")) throw new Error("PRIVATE_ASSET_REQUIRES_CONTROLLER_READ");
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
