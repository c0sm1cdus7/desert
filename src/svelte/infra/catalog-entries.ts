// The catalog's navigation as data (DESIGN §5): its groups, entry titles and search, derived from the canonical bank.
// It replaces infra/catalog-navigation.ts; the DOM helpers there (navigateCatalog, revealCatalogAnchor) are deleted:
// revealing and focusing go through the region registry and the focus scope.
import { ResolvedNodes, type ResolvedNodeId } from "../../interaction/catalog.ts";

export type CatalogEntry = typeof ResolvedNodes.entries[number];
export type CatalogFamily = typeof ResolvedNodes.groups[number]["id"];

// Navigation is a view of the canonical bank, not a separately maintained inventory.
export const catalogGroups = ResolvedNodes.groups.map(group => ({
  ...group, family: group.id, anchor: `catalog-${group.id}`,
  entries: ResolvedNodes.entries.filter(entry => entry.inspection.group === group.id),
}));

export function catalogTitle(id: ResolvedNodeId): string {
  if (id === 'action') return 'Button';
  if (id === 'transient') return 'Transient surface';
  const words = id.startsWith("input.") ? `${id.slice(6)} input` : id.replace(/^control\./, "");
  return words.charAt(0).toUpperCase() + words.slice(1).replaceAll(".", " ");
}

export function matchingEntries(query: string): readonly CatalogEntry[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return ResolvedNodes.entries.filter(entry => {
    const searchable = [entry.id, catalogTitle(entry.id), catalogGroups.find(group => group.id === entry.inspection.group)!.title,
      ...entry.states, ...entry.inspection.owners.flatMap(owner => {
        const foundation = ResolvedNodes.foundations.find(item => item.id === owner)!;
        return [foundation.title, foundation.rule];
      })].join(" ").toLowerCase();
    return terms.every(term => searchable.includes(term));
  });
}
