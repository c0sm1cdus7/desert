// Opens program minds and assistants with hand-assigned cards: publishes the choices, applies declared starting
// cards and explains every unavailable mind. No model is called here; the bank composes the catalog offline.
import { scrubDoorText } from "../../house/doors/door-material.ts";
import { parseMindActor } from "../../fields/mind-actor.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { assignDeclaredCards, mindNeeds, publishMindCards } from "./mind-card-catalog.ts";
import { assistantDefinition, liveDefinitions } from "./mind-definitions.ts";
import { eligibleMindCards } from "./mind-assignment.ts";
import { modelCandidates } from "./mind-model-bridge.ts";
import { supervisorCard } from "./mind-runtime-model.ts";
import {
  enabledMind,
  type MindRuntimeHouse,
  type MindRuntimeOptions,
  type MindSwitches,
} from "./mind-runtime-options.ts";
import { programMindAvailability } from "./program-mind-availability.ts";
/** A starting card declared for a mind the distribution does not define fails like one outside the catalog;
 * a defined mind switched off for this house keeps its declaration unused. Assistant cards are checked against
 * what every assistant needs, so enabling one while the house runs can never fail on its card. */
export async function prepareProgramMinds<X extends Program>(
  house: MindRuntimeHouse<X>,
  options: MindRuntimeOptions,
  switches: MindSwitches,
) {
  const unknown = Object.keys(options.cards ?? {}).find(
    actor => parseMindActor(actor)?.kind !== "assistant" && !options.definitions.some(each => each.actor === actor),
  );
  if (unknown) throw new Error(`mind.card: ${unknown}`);
  validateHostCards(house, options);
  const enabled: MindRuntimeOptions = {
    ...options,
    scrubProviderError: text => scrubDoorText(text, house.execution.state().house.doors),
    definitions: options.definitions.filter(definition => enabledMind(switches, definition.actor)),
  };
  const minds = liveDefinitions(enabled, house.execution.state().house, switches);
  publishMindCards(house, enabled, minds);
  assignDeclaredCards(house, enabled, minds);
  return house.active()
    ? programMindAvailability(house, enabled, liveDefinitions(enabled, house.execution.state().house, switches))
    : enabled;
}
function validateHostCards<X extends Program>(house: MindRuntimeHouse<X>, options: MindRuntimeOptions) {
  if (options.supervisorCard && !supervisorCard(options)) throw new Error("mind.card: mind:supervisor");
  const needs = mindNeeds(house, assistantDefinition(options, "assistant", "assistant"));
  const eligible = eligibleMindCards(modelCandidates(options.catalog), options.providers, needs);
  const declared = [
    ...(options.assistantCard ? [["assistant", options.assistantCard] as const] : []),
    ...Object.entries(options.cards ?? {}).filter(([actor]) => parseMindActor(actor)?.kind === "assistant"),
  ];
  for (const [actor, card] of declared)
    if (!eligible.some(each => each.name === card.model && each.version === card.effort))
      throw new Error(`mind.card: ${actor}`);
}
