import type { compile } from "../compile.ts";
import { loadDefinition } from "../compiled-definition.ts";
import { compileDependencies } from "../compile-dependencies.ts";
import { freezeDeep } from "../json.ts";
import type { JourneyDefinition } from "../program-grammar.ts";

export type Application = ReturnType<typeof compile>;
export function localProgram(application: Application, requestedRoles: readonly string[]) {
  const definition = loadDefinition(application);
  const graph = compileDependencies(definition);
  if (!Array.isArray(requestedRoles) || !requestedRoles.length || new Set(requestedRoles).size !== requestedRoles.length) {
    throw new Error("INVALID_CONTROLLER_ROLES");
  }
  const roles = Object.freeze([...requestedRoles].sort());
  for (const role of roles) if (graph.definitions.get(role)?.kind !== "controller") throw new Error("UNKNOWN_CONTROLLER");
  const installed = new Set(roles);
  const journeys = new Map<string, JourneyDefinition>();
  for (const journey of definition.journeys ?? []) {
    if (!installed.has(journey.requires.controller)) continue;
    if (graph.forJourney(journey).some(dependency => !installed.has(dependency))) throw new Error("UNSUPPORTED_LOCAL_DEPENDENCY");
    journeys.set(journey.id, journey);
  }
  for (const role of roles) if (![...journeys.values()].some(journey => journey.requires.controller === role)) {
    throw new Error("EMPTY_CONTROLLER");
  }
  const owners = new Map((definition.policies ?? []).map(policy => [policy.object, policy.field]));
  freezeDeep(definition);
  function journey(surface: string, id: string) {
    if (!application.surface(surface).journeys.some(item => item.id === id)) throw new Error("JOURNEY_NOT_EXPOSED");
    const found = journeys.get(id);
    if (!found) throw new Error("JOURNEY_NOT_INSTALLED");
    return found;
  }
  return { application, roles, owners, journey, objects:new Map(definition.objects.map(object => [object.id,object])) };
}
export type LocalProgram = ReturnType<typeof localProgram>;
