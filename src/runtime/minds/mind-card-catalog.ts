// Publishes every hand-assignable card as a public choice; no bank call happens here.
import { effect } from "../../house/facts.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { eligibleMindCards } from "./mind-assignment.ts";
import { modelCandidates } from "./mind-model-bridge.ts";
import type { MindRuntimeHouse, MindRuntimeOptions } from "./mind-runtime-options.ts";
export function publishMindCards<X extends Program>(house: MindRuntimeHouse<X>, options: MindRuntimeOptions) {
  if (!house.active()) return;
  for (const definition of options.definitions) {
    const needs = house.execution.registry
      .filter(
        tool => definition.actor === `mind:${tool.id}` || definition.communication.some(item => item.tool === tool.id),
      )
      .flatMap(tool => Object.values(tool.acts).flatMap(act => act.needs ?? []));
    const cards = eligibleMindCards(modelCandidates(options.catalog), options.providers, needs);
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
/** Assigns each declared starting card once; a declared card outside the catalog is a distribution error. */
export function assignDeclaredCards<X extends Program>(house: MindRuntimeHouse<X>, options: MindRuntimeOptions) {
  for (const definition of options.definitions) {
    const declared = options.cards?.[definition.actor];
    if (!declared || !house.active()) continue;
    const state = house.execution.state().house;
    if (state.mindAssignments.has(definition.actor)) continue;
    const card = state.mindCards
      .get(definition.actor)
      ?.find(each => each.card === declared.model && each.version === declared.effort);
    if (!card) throw new Error(`mind.card: ${definition.actor}`);
    house.execution.bus.emit(
      effect(
        "mind-card-assigned",
        { mind: definition.actor, ...card, capabilities: [...card.capabilities] },
        state.admin,
      ),
    );
  }
}
