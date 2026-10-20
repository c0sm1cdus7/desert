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
