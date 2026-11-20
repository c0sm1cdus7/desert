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
export async function prepareProgramMinds<X extends Program>(
  house: MindRuntimeHouse<X>,
  options: MindRuntimeOptions,
  switches: MindSwitches,
) {
  const enabled: MindRuntimeOptions = {
    ...options,
    scrubProviderError: text => scrubDoorText(text, house.execution.state().house.doors),
    definitions: options.definitions.filter(definition => enabledMind(switches, definition.actor)),
  };
  publishMindCards(house, enabled);
  assignDeclaredCards(house, enabled);
  return house.active() ? programMindAvailability(house, enabled) : enabled;
}
