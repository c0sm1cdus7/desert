import type { HumanSurface } from "../web/types.ts";
import type { View } from "./schema.ts";
import type { ViewJourney } from "./program-schema.ts";
import { viewInputs } from "./ports.ts";
import { requireActivityBindings, requireActivityViews } from "../activities/views.ts";

export function journeyViews(journey: ViewJourney, views: ReadonlyMap<string, View>): readonly View[] {
  if (journey.kind === "action") return [];
  const ids = journey.kind === "activity" ? [...new Set([...journey.activity.steps.map(step => step.view), journey.activity.review])]
    : journey.kind === "read" ? [journey.view, journey.detailView] : [journey.view];
  if (new Set(ids).size !== ids.length) throw new Error("DUPLICATE_JOURNEY_VIEW");
  return ids.map(id => {
    const definition = views.get(id);
    if (!definition) throw new Error("UNKNOWN_PROGRAM_VIEW");
    return definition;
  });
}

/** Presentation exposure does not infer navigation from a legacy default entry. */
export function validateJourneyExposure(journey: ViewJourney, surface: HumanSurface) {
  const canonical = surface.journeys.find(item => item.id === journey.id);
  if (journey.kind === "presentation") {
    if (canonical) throw new Error("PRESENTATION_JOURNEY_COLLISION");
    return;
  }
  if (!canonical) throw new Error("UNEXPOSED_VIEW_JOURNEY");
  if (journey.kind === "read") {
    if (canonical.kind !== "read") throw new Error("VIEW_JOURNEY_KIND_MISMATCH");
  } else {
    if (canonical.kind !== "mutation" || Boolean(canonical.subject) !== (journey.kind !== "create" && journey.kind !== "activity")) {
      throw new Error("VIEW_JOURNEY_KIND_MISMATCH");
    }
    if (journey.kind === "action" && canonical.inputFields.length) throw new Error("INVALID_VIEW_ACTION_INPUTS");
    if (journey.kind === "create" && journey.startWith &&
      (!canonical.inputFields.includes(journey.startWith.input) ||
        surface.fieldKinds?.[`${canonical.object}.${journey.startWith.input}`] !== "asset")) {
      throw new Error("INVALID_FILE_ENTRY_INPUT");
    }
    if (journey.kind === "create" && journey.startWith && journey.presentation !== "transient") {
      throw new Error("FILE_ENTRY_REQUIRES_TRANSIENT");
    }
    if (journey.kind === "activity" && journey.id !== journey.activity.journey) throw new Error("ACTIVITY_JOURNEY_MISMATCH");
    if (journey.kind === "activity" && surface.commit[journey.id] !== "review") throw new Error("ACTIVITY_REVIEW_REQUIRED");
  }
}

export function validateJourneyViews(journey: ViewJourney, owned: readonly View[]) {
  if (journey.kind === "action") return;
  if (journey.kind === "activity") {
    requireActivityViews(owned); requireActivityBindings(owned, journey.activity); return;
  }
  const main = owned[0]!;
  const expected = journey.kind === "presentation" ? (journey.collections ?? []).map(() => "collection") : [journey.kind === "read" ? "collection" : "form"];
  function inputs(definition: View, kinds: readonly string[]) {
    const ports = viewInputs(definition);
    if (ports.length !== kinds.length || ports.some((port, index) => port.kind !== kinds[index])) {
      throw new Error("INVALID_JOURNEY_VIEW_INPUTS");
    }
  }
  inputs(main, expected);
  if (journey.kind === "read") inputs(owned[1]!, ["context", ...(journey.related ?? []).map(() => "collection")]);
  for (const definition of owned) {
    if (definition.content.some(item => item.kind === "attention") && journey.kind !== "presentation") {
      throw new Error("INVALID_ATTENTION_CONTENT");
    }
    const media = definition.content.filter(item => item.kind === "media-library");
    if (media.length && definition.content.some(item => item.kind === "header" && item.media)) {
      throw new Error("CONFLICTING_VIEW_HEADER_MEDIA");
    }
    if (media.length && (journey.kind !== "presentation" || definition.content.length !== 2 ||
      definition.content[0]?.kind !== "header" || definition.content[1]?.kind !== "media-library")) {
      throw new Error("INVALID_JOURNEY_MEDIA_CONTENT");
    }
    const catalogs = definition.content.filter(item => item.kind === "visual-catalog");
    if (catalogs.length > 1 || (catalogs.length && journey.kind !== "presentation")) {
      throw new Error("INVALID_JOURNEY_CATALOG_CONTENT");
    }
    const appearance = definition.content.filter(item => item.kind === "appearance");
    if (appearance.length && (journey.kind !== "presentation" || definition.content.length !== 2 ||
      definition.content[0]?.kind !== "header" || definition.content[1]?.kind !== "appearance")) {
      throw new Error("INVALID_JOURNEY_APPEARANCE_CONTENT");
    }
    const system = definition.content.filter(item => item.kind === "system-status");
    if (system.length && (journey.kind !== "presentation" || definition.content.length !== 2 ||
      definition.content[0]?.kind !== "header" || definition.content[1]?.kind !== "system-status")) {
      throw new Error("INVALID_JOURNEY_SYSTEM_CONTENT");
    }
    const identity = definition.content.filter(item => item.kind === "identity");
    if (identity.length && (journey.kind !== "presentation" || definition.content.length !== 2 ||
      definition.content[0]?.kind !== "header" || definition.content[1]?.kind !== "identity")) {
      throw new Error("INVALID_JOURNEY_IDENTITY_CONTENT");
    }
  }
}
