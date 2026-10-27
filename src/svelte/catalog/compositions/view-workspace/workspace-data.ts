import type { ResolvedView } from "../../../../views/resolved.ts";
import type { ViewItem } from "../../../../views/schema.ts";
import type { NodeEvent } from "../../../../interaction/node-events.ts";
import type { PlaceIdentity } from "../../../infra/place-identity.ts";
import type { WorkspaceSearchResult } from "../../../infra/workspace-search.ts";
import { catalogTitle, matchingEntries } from "../../../infra/catalog-entries.ts";
import { retrieveCollection } from "../../../collection-retrieval.ts";
import { presentFact, presentTitle } from "../../../../interaction/fact-presentation.ts";
import { say } from "../../../infra/messages.ts";
import { m } from "../../../../messages/keys.ts";

/** Data adapter only: identity, search results and the selection a result makes. Geometry, focus and motion are the shell's. */
export function viewIdentity(resolved: ResolvedView, fallback: string): PlaceIdentity {
  const header = resolved.view.content.find(item => item.kind === "header");
  return header ? { ...header, subtitle: header.subtitle ?? "" }
    : { title: resolved.top?.title ?? fallback, subtitle: resolved.top?.subtitle ?? "" };
}

const contentItems = (resolved: ResolvedView): readonly ViewItem[] => resolved.view.content.flatMap(item =>
  item.kind === "stack" ? item.items : item.kind === "header" || item.kind === "visual-catalog" || item.kind === "media-library" ||
    item.kind === "navigation" || item.kind === "destination" || item.kind === "appearance" || item.kind === "identity" || item.kind === "attention" ? [] : [item]);
const recordKey = (item: string, record: string) => JSON.stringify([item, record]);

export function viewSearchResults(resolved: ResolvedView, query: string): readonly WorkspaceSearchResult[] {
  const terms = query.trim().toLowerCase().split(/\s+/u).filter(Boolean);
  if (!terms.length) return [];
  const results: WorkspaceSearchResult[] = resolved.view.content.some(item => item.kind === "visual-catalog") ? matchingEntries(query).map(entry => ({
    kind: "bank", id: entry.id, title: catalogTitle(entry.id), description: say(m.viewWorkspace.entry, { id: entry.id, states: entry.states.join(", ") }),
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
    if (node.presentation?.kind === "media-grid") {
      const presentation = node.presentation;
      for (const record of node.records) {
        const asset = record.facts[presentation.image];
        const title = typeof asset === 'object' && asset !== null && 'media' in asset && asset.media === 'video' ? say(m.viewWorkspace.video)
          : typeof asset === 'object' && asset !== null && 'media' in asset && asset.media === 'audio' ? say(m.viewWorkspace.audio)
          : say(m.viewWorkspace.image);
        const detail = presentation.description ? record.facts[presentation.description] : undefined;
        const description = typeof detail === 'string' ? detail : '';
        if (matches([title, description])) results.push({kind:'content',id:recordKey(item.id,record.id),title,description});
      }
      continue;
    }
    if (node.presentation?.kind === "collection-grid") {
      for (const record of node.records) {
        const title = presentTitle(record.facts[node.presentation.title]);
        if (matches([title])) results.push({kind:'content',id:recordKey(item.id,record.id),title,description:say(m.viewWorkspace.collection)});
      }
      continue;
    }
    for (const record of retrieveCollection(node.records, node.fields, query)) {
      results.push({ kind: "content", id: recordKey(item.id, record.id),
        title: presentTitle(record.facts[node.fields[0]!]),
        description: node.fields.slice(1).map(field => presentFact(record.facts[field])).join(" · ") });
    }
  }
  return results;
}

export function viewSearchSelection(resolved: ResolvedView, id: string): NodeEvent | null {
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
