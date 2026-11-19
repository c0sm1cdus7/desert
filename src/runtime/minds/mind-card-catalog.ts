// Publish only current role certificates as selectable public cards; no bank call happens here.
import { effect } from "../../house/facts.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { eligibleMindCards } from "./mind-assignment.ts";
import { modelCandidates } from "./mind-model-bridge.ts";
import type { MindRuntimeHouse, MindRuntimeOptions } from "./mind-runtime-options.ts";
export function publishMindCards<X extends Program>(
  house: MindRuntimeHouse<X>,
  options: MindRuntimeOptions,
  clear = false,
) {
  if (!house.active()) return;
  for (const definition of options.definitions) {
    const needs = house.execution.registry
      .filter(
        tool => definition.actor === `mind:${tool.id}` || definition.communication.some(item => item.tool === tool.id),
      )
      .flatMap(tool => Object.values(tool.acts).flatMap(act => act.needs ?? []));
    const cards = clear
      ? []
      : eligibleMindCards(
          modelCandidates(options.catalog),
          definition.role,
          options.providers,
          needs,
          options.fingerprint(definition),
        );
    house.execution.bus.emit(
      effect(
        "mind-cards-published",
        {
          mind: definition.actor,
          cards: cards.map(card => ({ card: card.name, version: card.version, capabilities: [...card.capabilities] })),
        },
        house.execution.state().house.admin,
      ),
    );
  }
}
