import { Check } from "@sinclair/typebox/value";
import { ConnectionPolicySchema } from "../connection-policy.ts";
import { requireProgramOwnedNavigation } from "../navigation-ownership.ts";
import { freezeDeep } from "../json.ts";
import type { Surface } from "../web/types.ts";
import { ViewProgramSchema, type ViewProgram } from "./program-schema.ts";
import { viewSnapshot } from "./snapshot.ts";
import { viewCatalog } from "./catalog.ts";
import { journeyViews, validateJourneyExposure, validateJourneyViews } from "./program-views.ts";
import { validateJourneyOutputs } from "./program-outputs.ts";
import { validateProgramBindings } from "./program-bindings.ts";
import { validateProgramHeaders } from "./program-headers.ts";
import { viewHeaderImages } from "./header-media.ts";
import { InteractionProtocolVersion } from "../interaction/protocol.ts";
import { requireFieldPresentation } from "../field-representation.ts";
import { validateProgramWorkspace } from "./program-workspace.ts";

/** Bind presentation to an already compiled human exposure; this grants no execution authority. */
export function compileViewProgram(definition: unknown, surface: Surface): ViewProgram {
  requireProgramOwnedNavigation(surface);
  const input = viewSnapshot(definition);
  if (!Check(ViewProgramSchema, input)) throw new Error("INVALID_VIEW_PROGRAM");
  if (surface.kind !== "human" || surface.protocol !== InteractionProtocolVersion ||
    !surface.language || !surface.commit || !surface.connection ||
    !Check(ConnectionPolicySchema, surface.connection)) throw new Error("INVALID_VIEW_PROGRAM_SURFACE");
  const fieldPresentation = requireFieldPresentation(surface.fieldRepresentations, surface.fieldKinds, Object.keys(surface.language.fields));
  const human = { ...surface, language: surface.language,
    commit: surface.commit, connection: surface.connection, ...fieldPresentation };
  if (input.productId !== surface.productId) throw new Error("VIEW_PROGRAM_PRODUCT_MISMATCH");
  const views = new Map(viewCatalog(input.views).map(item => [item.id, item]));
  const journeys = new Map(input.journeys.map(item => [item.id, item]));
  if (journeys.size !== input.journeys.length) throw new Error("DUPLICATE_VIEW_JOURNEY");
  const destinations = new Map(input.destinations.map(item => [item.id, item]));
  if (destinations.size !== input.destinations.length) throw new Error("DUPLICATE_VIEW_DESTINATION");
  const usedViews = new Set(validateProgramWorkspace(input));
  for (const value of views.values()) {
    for (const item of value.content) if (item.kind === "header" && item.media) viewHeaderImages(item.media);
    if (value.content.findIndex(item => item.kind === "header") > 0) throw new Error("INVALID_PROGRAM_HEADER_PLACEMENT");
  }
  // Exposure is checked before output references so forged canonical identities fail at their owner.
  for (const journey of journeys.values()) validateJourneyExposure(journey, human);
  validateProgramBindings(input, human);
  validateProgramHeaders(input);
  for (const journey of journeys.values()) {
    const owned = journeyViews(journey, views);
    owned.forEach(item => usedViews.add(item.id));
    validateJourneyViews(journey, owned);
    validateJourneyOutputs(journey, owned, journeys);
  }
  if (usedViews.size !== views.size) throw new Error("UNUSED_PROGRAM_VIEW");
  for (const destination of destinations.values()) {
    const journey = journeys.get(destination.entryJourney);
    if (!journey) throw new Error("UNKNOWN_DESTINATION_JOURNEY");
    if (journey.kind !== "presentation" && journey.kind !== "read") throw new Error("INVALID_DESTINATION_JOURNEY");
  }
  for (const journey of journeys.values()) {
    if (journey.kind !== "presentation" && journey.kind !== "read") continue;
    const entries = input.destinations.filter(item => item.entryJourney === journey.id);
    const companionRead = Object.values(human.fieldReferences ?? {}).some(reference => reference.read === journey.id);
    const boundRead = journey.kind === "read" && journey.presentation !== "main" && (companionRead || input.journeys.some(owner =>
      owner.kind === "presentation" ? owner.collections?.some(binding => binding.read === journey.id)
        : owner.kind === "read" && owner.related?.some(binding => binding.read === journey.id)));
    if (entries.length !== 1 && !(entries.length === 0 && boundRead)) throw new Error("INVALID_JOURNEY_DESTINATION_COUNT");
  }
  if (!destinations.has(input.entry)) throw new Error("UNKNOWN_ENTRY_DESTINATION");
  const navigation = input.navigation.map(item => item.destination);
  if (new Set(navigation).size !== navigation.length) throw new Error("DUPLICATE_NAVIGATION_DESTINATION");
  if (navigation.some(id => !destinations.has(id))) throw new Error("UNKNOWN_NAVIGATION_DESTINATION");
  const reachable = new Set([input.entry, ...navigation].map(id => destinations.get(id)!.entryJourney));
  for (const object of input.objects ?? []) for (const action of object.actions) reachable.add(action.journey);
  for (const reference of Object.values(human.fieldReferences ?? {})) {
    if (journeys.has(reference.read)) reachable.add(reference.read);
  }
  // Attention is a resume route for existing occurrences, never a second creation entry.
  if (input.views.some(view => view.content.some(item => item.kind === "attention"))) {
    for (const journey of input.journeys) if (journey.kind === "activity") reachable.add(journey.id);
  }
  const pending = [...reachable];
  while (pending.length) {
    const current = journeys.get(pending.pop()!)!;
    if (current.kind === "presentation") for (const binding of current.collections ?? []) {
      if (!reachable.has(binding.read)) { reachable.add(binding.read); pending.push(binding.read); }
    }
    if (current.kind === "read") for (const binding of current.related ?? []) {
      if (!reachable.has(binding.read)) { reachable.add(binding.read); pending.push(binding.read); }
    }
    for (const output of current.outputs) {
      if (output.action.kind !== "journey" || reachable.has(output.action.journey)) continue;
      reachable.add(output.action.journey);
      pending.push(output.action.journey);
    }
  }
  if (reachable.size !== journeys.size) throw new Error("UNREACHABLE_PROGRAM_JOURNEY");
  return freezeDeep(input);
}
