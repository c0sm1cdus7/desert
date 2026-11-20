// Opens program minds with hand-assigned cards: publishes the choices, applies declared starting cards and
// explains every unavailable mind. No model is called here; the bank composes the catalog offline.
import { scrubDoorText } from "../../house/doors/door-material.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { assignDeclaredCards, publishMindCards } from "./mind-card-catalog.ts";
import {
  enabledMind,
  type MindRuntimeHouse,
  type MindRuntimeOptions,
  type MindSwitches,
} from "./mind-runtime-options.ts";
import { programMindAvailability } from "./program-mind-availability.ts";
/** A starting card declared for a mind the distribution does not define fails like one outside the catalog;
 * a defined mind switched off for this house keeps its declaration unused. */
export async function prepareProgramMinds<X extends Program>(
  house: MindRuntimeHouse<X>,
  options: MindRuntimeOptions,
  switches: MindSwitches,
) {
  const unknown = Object.keys(options.cards ?? {}).find(
    actor => !options.definitions.some(each => each.actor === actor),
  );
  if (unknown) throw new Error(`mind.card: ${unknown}`);
  const enabled: MindRuntimeOptions = {
    ...options,
    scrubProviderError: text => scrubDoorText(text, house.execution.state().house.doors),
    definitions: options.definitions.filter(definition => enabledMind(switches, definition.actor)),
  };
  publishMindCards(house, enabled);
  assignDeclaredCards(house, enabled);
  return house.active() ? programMindAvailability(house, enabled) : enabled;
}
