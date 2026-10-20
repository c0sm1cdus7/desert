import type { JourneyDefinition, SurfaceDefinition } from "./program-grammar.ts";
import type { InputPrimitive } from "./interaction/catalog.ts";

type Human = Extract<SurfaceDefinition, { kind: "human" }>;
type Read = Extract<JourneyDefinition, { kind: "read" }>;
type Mutation = Extract<JourneyDefinition, { kind: "mutation" }>;
type Create = Mutation & { command: { kind: "create" } };
type Update = Mutation & { command: { kind: "update" } };
type InputKey<J> = J extends Mutation ? `${J["command"]["object"]}.${J["command"]["input"][number]}` : never;

export function humanSurface<const Id extends string, const J extends JourneyDefinition[]>(definition: {
  id: Id, journeys: J, entry: Extract<J[number], Read>, primaryAction: Extract<J[number], Create>,
  subjectActions: Extract<J[number], Update>[], connection: Human["connection"],
  inputs?: Partial<Record<NoInfer<InputKey<J[number]>>, InputPrimitive>>,
  commit: Record<NoInfer<Extract<J[number], Mutation>["id"]>, "submit" | "review">,
  language: Omit<Human["language"], "journeys"> & { journeys: Record<NoInfer<J[number]["id"]>, string> },
}) {
  return { ...definition, kind: "human" as const, journeys: definition.journeys.map(journey => journey.id),
    entry: definition.entry.id, primaryAction: definition.primaryAction.id,
    subjectActions: definition.subjectActions.map(journey => journey.id) };
}

export function agentSurface<const Id extends string>(id: Id, journeys: JourneyDefinition[]) {
  return { id, kind: "agent" as const, journeys: journeys.map(journey => journey.id) };
}
