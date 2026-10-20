import type { compile } from "../compile.ts";
import { loadDefinition } from "../compiled-definition.ts";
import { compileDependencies } from "../compile-dependencies.ts";
import { freezeDeep } from "../json.ts";
import type { JourneyDefinition } from "../program-grammar.ts";

export type Application = ReturnType<typeof compile>;
export function localProgram(application: Application, role: string) {
  const definition = loadDefinition(application);
  const graph = compileDependencies(definition);
  const controller = graph.definitions.get(role);
  if (controller?.kind !== "controller") throw new Error("UNKNOWN_CONTROLLER");
  const journeys = new Map<string, JourneyDefinition>();
  for (const journey of definition.journeys ?? []) {
    if (journey.requires.controller !== role) continue;
    if (graph.forJourney(journey).some(dependency => dependency !== role)) throw new Error("UNSUPPORTED_LOCAL_DEPENDENCY");
    journeys.set(journey.id, journey);
  }
  if (!journeys.size) throw new Error("EMPTY_CONTROLLER");
  const owners = new Map((definition.policies ?? []).map(policy => [policy.object, policy.field]));
  freezeDeep(definition);
  function journey(surface: string, id: string) {
    if (!application.surface(surface).journeys.some(item => item.id === id)) throw new Error("JOURNEY_NOT_EXPOSED");
    const found = journeys.get(id);
    if (!found) throw new Error("JOURNEY_NOT_INSTALLED");
    return found;
  }
  return { application, role, owners, journey };
}
export type LocalProgram = ReturnType<typeof localProgram>;
