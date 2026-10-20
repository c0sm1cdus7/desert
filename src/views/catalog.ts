import { freezeDeep } from "../json.ts";
import { ViewLimits, type View } from "./schema.ts";
import { viewSnapshot } from "./snapshot.ts";
import { view } from "./view.ts";

/** Resolve composition references only; navigation and journey bindings are not installed here. */
export function viewCatalog(definitions: unknown): readonly View[] {
  const input = viewSnapshot(definitions);
  if (!Array.isArray(input) || input.length === 0 || input.length > ViewLimits.catalogSize) {
    throw new Error("INVALID_VIEW_CATALOG");
  }
  const views = input.map(view);
  const registry = new Map<string, View>();
  for (const definition of views) {
    if (registry.has(definition.id)) throw new Error("DUPLICATE_VIEW_ID");
    registry.set(definition.id, definition);
  }
  const references = (definition: View) => [definition.leftDock, definition.rightDock]
    .filter(dock => dock !== undefined).map(dock => dock.view);
  for (const definition of views) {
    if (references(definition).some(id => !registry.has(id))) throw new Error("UNKNOWN_VIEW_REFERENCE");
  }
  const active = new Set<string>();
  const summaries = new Map<string, { depth: number; expanded: number }>();
  function inspect(id: string): { depth: number; expanded: number } {
    if (active.has(id)) throw new Error("CYCLIC_VIEW_REFERENCE");
    const known = summaries.get(id);
    if (known) return known;
    active.add(id);
    const children = references(registry.get(id)!).map(inspect);
    active.delete(id);
    const summary = {
      depth: 1 + Math.max(0, ...children.map(child => child.depth)),
      expanded: 1 + children.reduce((total, child) => total + child.expanded, 0),
    };
    if (summary.depth > ViewLimits.referenceDepth) throw new Error("VIEW_REFERENCE_DEPTH_EXCEEDED");
    if (summary.expanded > ViewLimits.expandedViews) throw new Error("VIEW_EXPANSION_LIMIT_EXCEEDED");
    summaries.set(id, summary);
    return summary;
  }
  for (const definition of views) inspect(definition.id);
  return freezeDeep(views);
}
