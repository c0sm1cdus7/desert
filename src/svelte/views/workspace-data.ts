import type { ResolvedView } from "../../views/resolved.ts";
import type { ViewItem } from "../../views/schema.ts";
import type { BankEvent } from "../../interaction/bank-events.ts";
import type { PlaceIdentity } from "../pieces/place-identity.ts";
import type { WorkspaceSearchResult } from "../explorer/workspace-search.ts";
import { catalogTitle, matchingEntries } from "../catalog/navigation.ts";

/** Data adapter only. Geometry, material, focus and motion remain in CatalogWorkspace. */
export function viewIdentity(resolved: ResolvedView, fallback: string): PlaceIdentity {
  const header = resolved.view.content.find(item => item.kind === "header");
  return header ?? { title: resolved.top?.title ?? fallback, subtitle: resolved.top?.subtitle ?? "" };
}

const contentItems = (resolved: ResolvedView): readonly ViewItem[] => resolved.view.content.flatMap(item =>
  item.kind === "stack" ? item.items : item.kind === "header" || item.kind === "visual-catalog" ? [] : [item]);
const recordKey = (item: string, record: string) => JSON.stringify([item, record]);

export function viewSearchResults(resolved: ResolvedView, query: string): readonly WorkspaceSearchResult[] {
  const terms = query.trim().toLowerCase().split(/\s+/u).filter(Boolean);
  if (!terms.length) return [];
  const results: WorkspaceSearchResult[] = resolved.view.content.some(item => item.kind === "visual-catalog") ? matchingEntries(query).map(entry => ({
    kind: "bank", id: entry.id, title: catalogTitle(entry.id), description: `${entry.id} · ${entry.states.join(", ")}`,
  })) : [];
  const matches = (values: readonly unknown[]) => terms.every(term => values.join(" ").toLowerCase().includes(term));
  for (const item of resolved.view.content) {
    if (item.kind !== "stack") continue;
    const description = item.description ?? item.items.flatMap(child => child.kind === "text" ? [child.text] : []).join(" ");
    if (matches([item.title, description])) results.push({ kind: "content", id: item.id, title: item.title, description });
  }
  for (const item of contentItems(resolved)) {
    if (item.kind !== "collection") continue;
    const node = resolved.bindings[item.input];
    if (node?.kind !== "collection" || !node.loaded || node.disabled) continue;
    for (const record of node.records) {
      const values = node.fields.map(field => String(record.facts[field] ?? ""));
      if (matches(values)) results.push({ kind: "content", id: recordKey(item.id, record.id),
        title: values[0] || record.id, description: values.slice(1).join(" · ") });
    }
  }
  return results;
}

export function viewSearchSelection(resolved: ResolvedView, id: string): BankEvent | null {
  for (const item of contentItems(resolved)) {
    if (item.kind !== "collection" || resolved.disabledOutputs.includes(item.output)) continue;
    const node = resolved.bindings[item.input];
    if (node?.kind !== "collection" || !node.loaded || node.disabled) continue;
    const record = node.records.find(record => recordKey(item.id, record.id) === id);
    if (record) return { kind: "surface.invoke", intent: {
      kind: "view.output", view: resolved.view.id, output: item.output, recordId: record.id,
    } };
  }
  return null;
}
