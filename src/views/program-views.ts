import type { HumanSurface } from "../web/types.ts";
import type { View } from "./schema.ts";
import type { ViewJourney } from "./program-schema.ts";
import { viewInputs } from "./ports.ts";

export function journeyViews(journey: ViewJourney, views: ReadonlyMap<string, View>): readonly View[] {
  const ids = journey.kind === "read" ? [journey.view, journey.detailView] : [journey.view];
  if (new Set(ids).size !== ids.length) throw new Error("DUPLICATE_JOURNEY_VIEW");
  return ids.map(id => {
    const definition = views.get(id);
    if (!definition) throw new Error("UNKNOWN_PROGRAM_VIEW");
    return definition;
  });
}

/** This slice binds the existing single collection/create engine, not a second executor. */
export function validateJourneyExposure(journey: ViewJourney, surface: HumanSurface) {
  const canonical = surface.journeys.find(item => item.id === journey.id);
  if (journey.kind === "presentation") {
    if (canonical) throw new Error("PRESENTATION_JOURNEY_COLLISION");
    return;
  }
  if (!canonical) throw new Error("UNEXPOSED_VIEW_JOURNEY");
  if (journey.kind === "read") {
    if (canonical.kind !== "read") throw new Error("VIEW_JOURNEY_KIND_MISMATCH");
    if (journey.id !== surface.navigation.entry) throw new Error("UNSUPPORTED_VIEW_READ_JOURNEY");
  } else {
    if (canonical.kind !== "mutation" || canonical.subject) throw new Error("VIEW_JOURNEY_KIND_MISMATCH");
    if (journey.id !== surface.navigation.primaryAction) throw new Error("UNSUPPORTED_VIEW_CREATE_JOURNEY");
    const read = surface.journeys.find(item => item.id === surface.navigation.entry);
    if (read?.kind !== "read" || read.subject !== canonical.object) throw new Error("VIEW_JOURNEY_OBJECT_MISMATCH");
  }
}

export function validateJourneyViews(journey: ViewJourney, owned: readonly View[]) {
  const main = owned[0]!;
  const expected = journey.kind === "presentation" ? [] : [journey.kind === "read" ? "collection" : "form"];
  function inputs(definition: View, kinds: readonly string[]) {
    const ports = viewInputs(definition);
    if (ports.length !== kinds.length || ports.some((port, index) => port.kind !== kinds[index])) {
      throw new Error("INVALID_JOURNEY_VIEW_INPUTS");
    }
  }
  function panel(definition: View, kind: "form" | "context") {
    inputs(definition, [kind]);
    if (definition.content.length !== 2 || definition.content[0]?.kind !== "header" || definition.content[1]?.kind !== kind) {
      throw new Error("UNSUPPORTED_PANEL_VIEW_CONTENT");
    }
  }
  inputs(main, expected);
  if (journey.kind === "create") panel(main, "form");
  if (journey.kind === "read") panel(owned[1]!, "context");
  for (const definition of owned) {
    const catalogs = definition.content.filter(item => item.kind === "visual-catalog");
    if (catalogs.length > 1 || (catalogs.length && journey.kind !== "presentation")) {
      throw new Error("INVALID_JOURNEY_CATALOG_CONTENT");
    }
  }
}
