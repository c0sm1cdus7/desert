import type { View, ViewBoundContent, ViewContent } from "./schema.ts";

/** Derived data ports; no duplicate input schema or editable field list is authored. */
export function viewInputs(definition: View): readonly ViewBoundContent[] {
  return Object.freeze(definition.content.flatMap<ViewContent>(item => item.kind === "stack" ? item.items : [item])
    .filter((item): item is ViewBoundContent =>
      item.kind === "collection" || item.kind === "form" || item.kind === "context"));
}
