import type { HumanSurface, Mutation, Read } from "../types.ts";

export function readPresentation(surface: HumanSurface, id: string): Read {
  const journey = surface.journeys.find(value => value.id === id);
  if (!journey || journey.kind !== "read") throw new Error("READ_PRESENTATION_REQUIRED");
  return journey;
}

export function mutationPresentation(surface: HumanSurface, id: string): Mutation {
  const journey = surface.journeys.find(value => value.id === id);
  if (!journey || journey.kind !== "mutation") throw new Error("MUTATION_PRESENTATION_REQUIRED");
  return journey;
}
