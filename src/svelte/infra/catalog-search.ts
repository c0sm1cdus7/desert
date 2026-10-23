import { projectPublicCatalog, type PublicCatalogSurface } from "../../public-catalog/client.ts";
import type { CatalogItemNode } from "../../public-catalog/node-schema.ts";
import type { PrimitiveId } from "../../interaction/catalog.ts";
import { catalogTitle, matchingEntries } from "./catalog-navigation.ts";
import { stackNodes } from "../../interaction/place.ts";

export type CatalogDestination = "browse" | "travel-kit" | "bank";
export type CatalogSearchResult =
  | { kind: "record"; id: string; node: CatalogItemNode }
  | { kind: "bank"; id: PrimitiveId; title: string; description: string }
  | { kind: "exercise"; id: string; title: string; description: string };

/** Renderer-local providers consume exposed metadata, never controller or draft data. */
export function catalogSearchScope(surface: PublicCatalogSurface, destination: CatalogDestination) {
  if (destination === "bank") return { title: "Component bank",
    description: "Find components by name, identifier or state." };
  if (destination === "travel-kit") return { title: surface.exercises?.title ?? "Travel kit",
    description: "Search section names, descriptions and control labels, not your local draft values." };
  return { title: surface.title, description: "Find places by their published names and descriptions." };
}

export function catalogSearchResults(surface: PublicCatalogSurface, destination: CatalogDestination,
  query: string): readonly CatalogSearchResult[] {
  const terms = query.trim().toLowerCase().split(/\s+/u).filter(Boolean);
  if (!terms.length) return [];
  if (destination === "bank") return matchingEntries(query).map(entry => ({
    kind: "bank", id: entry.id, title: catalogTitle(entry.id),
    description: `${entry.id} · ${entry.states.join(", ")}`,
  }));
  if (destination === "travel-kit") return (surface.exercises?.stacks ?? []).filter(section => {
    const labels = stackNodes(section.items).flatMap(node => {
      if ("control" in node) return [node.control.label];
      if (node.kind === "input.text" || node.kind === "input.multiline") return [node.label];
      if (node.kind === "fact") return Object.values(node.details.labels);
      if (node.kind === "catalog.card") return [node.title, node.presentation === "featured" ? node.eyebrow : ""];
      return [];
    });
    const text = [section.title, section.description, ...labels].join(" ").toLowerCase();
    return terms.every(term => text.includes(term));
  }).map(section => ({ kind: "exercise", id: section.id, title: section.title, description: section.description ?? "" }));
  return projectPublicCatalog(surface, { query, selectedId: null }).results.map(node => ({ kind: "record", id: node.record, node }));
}
