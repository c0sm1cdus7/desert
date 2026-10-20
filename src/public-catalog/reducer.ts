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
