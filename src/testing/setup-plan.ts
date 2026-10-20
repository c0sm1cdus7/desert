import type { ProductDefinition } from "../contracts.ts";
import type { JourneyDefinition } from "../program-grammar.ts";
import { commandInputs } from "./values.ts";
import { VerificationGap, type Facts, type Step } from "./types.ts";

export const objectIdOf = (journey: JourneyDefinition) => journey.kind === "read" ? journey.object : journey.command.object;
export const conditionsHold = (facts: Facts, conditions: Facts) =>
  Object.entries(conditions).every(([key, value]) => facts[key] === value);

// This planner predicts reachability only. It never supplies expected observations.
function predictedFacts(step: Step, before: Facts): Facts {
  const command = step.journey.command;
  const assignments = command.kind === "create" ? command.values : command.set;
  return Object.assign({}, before, Object.fromEntries(Object.entries(assignments).map(([field, expression]) => {
    switch (expression.kind) {
      case "literal": return [field, expression.value];
      case "input": return [field, step.input[expression.field]!];
      case "actor": return [field, "$test-actor"];
    }
  })));
}

export function reachableStates(product: ProductDefinition, objectId: string, seed: number) {
  const steps: Step[] = (product.journeys ?? []).flatMap(journey => {
    if (journey.kind !== "mutation" || journey.command.object !== objectId) return [];
    const surface = product.surfaces?.find(surface => surface.journeys.includes(journey.id));
    if (!surface) return [];
    return commandInputs(product, journey.command, seed).map(input => ({ journey, surfaceId: surface.id, input }));
  });
  const states: { facts: Facts, steps: Step[] }[] = [];
  const seen = new Set<string>();
  function add(facts: Facts, path: Step[]) {
    const key = JSON.stringify(Object.entries(facts).sort(([a], [b]) => a.localeCompare(b)));
    if (seen.has(key)) return;
    if (states.length >= 256 || path.length > 8) throw new VerificationGap("SETUP_SEARCH_LIMIT");
    seen.add(key);
    states.push({ facts, steps: path });
  }
  for (const step of steps.filter(step => step.journey.command.kind === "create")) {
    add(predictedFacts(step, {}), [step]);
  }
  for (let index = 0; index < states.length; index++) {
    const state = states[index]!;
    for (const step of steps) {
      const command = step.journey.command;
      if (command.kind === "update" && conditionsHold(state.facts, command.when)) {
        add(predictedFacts(step, state.facts), [...state.steps, step]);
      }
    }
  }
  return states;
}

export function setupFor(product: ProductDefinition, journey: JourneyDefinition, seed: number) {
  if (journey.kind === "mutation" && journey.command.kind === "create") return [];
  const states = reachableStates(product, objectIdOf(journey), seed);
  const command = journey.kind === "mutation" ? journey.command : undefined;
  const matching = states.find(state => command?.kind !== "update" || conditionsHold(state.facts, command.when));
  if (!matching) throw new VerificationGap("NO_GENERATED_SETUP");
  return matching.steps;
}
