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
