import assert from "node:assert/strict";
import { Notebook } from "../../products/notebook/product.ts";
import { CreateNote } from "../../products/notebook/journeys.ts";

export type NotebookJourney = typeof Notebook.journeys[number];
export type JourneyId = NotebookJourney["id"];
export const noteSamples = {
  seed: { title: "Seed", body: "Private content" },
  create: { title: "New note", body: "New content" },
};

function literalState(expression: { kind: string, value?: string | number } | undefined) {
  assert.equal(expression?.kind, "literal", "Notebook case requires a declared literal state");
  assert.equal(typeof expression?.value, "string");
  return expression!.value as string;
}

export const initialState = literalState(CreateNote.command.values.state);

export function notebookCase(journey: NotebookJourney) {
  const command = journey.kind === "mutation" ? journey.command : undefined;
  const input = Object.fromEntries((command?.input ?? []).map(field => [field, noteSamples.create[field]]));
  const state = command?.kind === "create" ? command.values.state
    : command?.kind === "update" ? command.set.state : CreateNote.command.values.state;
  return {
    journey, kind: journey.kind, input,
    expectedCount: command?.kind === "create" ? 2 : 1,
    expectedState: literalState(state),
  };
}

// The inventory and semantics come from authored entities, not a parallel product.
export const journeyCases = Object.fromEntries(
  Notebook.journeys.map(journey => [journey.id, notebookCase(journey)]),
) as Record<JourneyId, ReturnType<typeof notebookCase>>;
