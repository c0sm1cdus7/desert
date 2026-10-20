import { Check } from "@sinclair/typebox/value";
import { freezeDeep } from "../json.ts";
import type { Surface } from "../web/types.ts";
import { ViewProgramSchema, type ViewProgram } from "./program-schema.ts";
import { viewSnapshot } from "./snapshot.ts";
import { viewCatalog } from "./catalog.ts";
import { journeyViews, validateJourneyExposure, validateJourneyViews } from "./program-views.ts";
import { validateJourneyOutputs } from "./program-outputs.ts";

/** Bind presentation to an already compiled human exposure; this grants no execution authority. */
export function compileViewProgram(definition: unknown, surface: Surface): ViewProgram {
  const input = viewSnapshot(definition);
  if (!Check(ViewProgramSchema, input)) throw new Error("INVALID_VIEW_PROGRAM");
  if (surface.kind !== "human" || surface.protocol !== "desert.interaction/6" || !surface.navigation ||
    !surface.language || !surface.commit || !surface.connection) throw new Error("INVALID_VIEW_PROGRAM_SURFACE");
  const human = { ...surface, navigation: surface.navigation, language: surface.language,
    commit: surface.commit, connection: surface.connection };
  if (input.productId !== surface.productId) throw new Error("VIEW_PROGRAM_PRODUCT_MISMATCH");
  const views = new Map(viewCatalog(input.views).map(item => [item.id, item]));
  const journeys = new Map(input.journeys.map(item => [item.id, item]));
  if (journeys.size !== input.journeys.length) throw new Error("DUPLICATE_VIEW_JOURNEY");
  const destinations = new Map(input.destinations.map(item => [item.id, item]));
  if (destinations.size !== input.destinations.length) throw new Error("DUPLICATE_VIEW_DESTINATION");
  for (const value of views.values()) {
    if (value.leftDock || value.rightDock) throw new Error("UNSUPPORTED_PROGRAM_SIDE_DOCK");
    if (value.content.some(item => item.kind === "header" && item.media)) throw new Error("UNSUPPORTED_PROGRAM_HEADER_MEDIA");
    if (value.content.findIndex(item => item.kind === "header") > 0) throw new Error("INVALID_PROGRAM_HEADER_PLACEMENT");
  }
  const usedViews = new Set<string>();
  // Exposure is checked before output references so forged canonical identities fail at their owner.
  for (const journey of journeys.values()) validateJourneyExposure(journey, human);
  if (input.journeys.filter(item => item.kind === "read").length !== 1 ||
    input.journeys.filter(item => item.kind === "create").length !== 1) {
    throw new Error("INVALID_VIEW_PROGRAM_JOURNEY_COUNT");
  }
  for (const journey of journeys.values()) {
    const owned = journeyViews(journey, views);
    owned.forEach(item => usedViews.add(item.id));
    validateJourneyViews(journey, owned);
    validateJourneyOutputs(journey, owned, new Set(journeys.keys()));
  }
  if (usedViews.size !== views.size) throw new Error("UNUSED_PROGRAM_VIEW");
  for (const destination of destinations.values()) {
    const journey = journeys.get(destination.entryJourney);
    if (!journey) throw new Error("UNKNOWN_DESTINATION_JOURNEY");
    if (journey.kind === "create") throw new Error("INVALID_DESTINATION_JOURNEY");
  }
  for (const journey of journeys.values()) {
    if (journey.kind === "create") continue;
    const entries = input.destinations.filter(item => item.entryJourney === journey.id);
    if (entries.length !== 1) throw new Error("INVALID_JOURNEY_DESTINATION_COUNT");
  }
  if (!destinations.has(input.entry)) throw new Error("UNKNOWN_ENTRY_DESTINATION");
  if (new Set(input.navigation).size !== input.navigation.length) throw new Error("DUPLICATE_NAVIGATION_DESTINATION");
  if (input.navigation.some(id => !destinations.has(id))) throw new Error("UNKNOWN_NAVIGATION_DESTINATION");
  if (!input.navigation.includes(input.entry)) throw new Error("UNLISTED_ENTRY_DESTINATION");
  if (input.navigation.length !== destinations.size) throw new Error("UNLISTED_PROGRAM_DESTINATION");
  const reachable = new Set(input.destinations.map(item => item.entryJourney));
  const pending = [...reachable];
  while (pending.length) {
    for (const output of journeys.get(pending.pop()!)!.outputs) {
      if (output.action.kind !== "journey" || reachable.has(output.action.journey)) continue;
      reachable.add(output.action.journey);
      pending.push(output.action.journey);
    }
  }
  if (reachable.size !== journeys.size) throw new Error("UNREACHABLE_PROGRAM_JOURNEY");
  return freezeDeep(input);
}
