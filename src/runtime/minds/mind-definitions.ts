// Resolves the minds of the house as it is now: the distribution's program minds and one per assistant.
import { assistantOf } from "../../fields/mind-actor.ts";
import type { House } from "../../house/members.ts";
import { assistantMindRules } from "../../texts/program-mind.texts.ts";
import type { MindDefinition } from "../../tools/minds/mind-contract.ts";
import { enabledMind, type MindRuntimeOptions, type MindSwitches } from "./mind-runtime-options.ts";
type Sources = Pick<MindRuntimeOptions, "definitions" | "talk">;
/** One supervisor per house; composition reserves the program id, so no program mind can take this actor. */
export const supervisorActor = "mind:supervisor";
const made = new WeakMap<Sources, Map<string, MindDefinition>>();
/** An assistant thinks as itself, for its owner, and says things only through the talk programs. */
export function assistantDefinition(options: Sources, owner: string, name: string): MindDefinition {
  const cache = made.get(options) ?? new Map<string, MindDefinition>();
  made.set(options, cache);
  const key = JSON.stringify([owner, name]);
  const known = cache.get(key);
  if (known) return known;
  const definition: MindDefinition = Object.freeze({
    actor: assistantOf(owner),
    role: "assistant",
    rules: {
      ...assistantMindRules,
      text: (language: Parameters<typeof assistantMindRules.text>[0]) =>
        assistantMindRules.text(language, { name, owner }),
    },
    communication: Object.freeze([{ tool: "mind", act: "scene" }, ...(options.talk ?? [])]),
  });
  cache.set(key, definition);
  return definition;
}
/** Program minds as declared, then every assistant the house knows; a host definition for an actor wins. */
export function definitionsNow(options: Sources, house: Pick<House, "assistants">): readonly MindDefinition[] {
  const declared = new Set(options.definitions.map(each => each.actor));
  return [
    ...options.definitions,
    ...[...house.assistants.values()]
      .filter(assistant => !declared.has(assistantOf(assistant.owner)))
      .map(assistant => assistantDefinition(options, assistant.owner, assistant.name)),
  ];
}
export function definitionOf(
  options: Sources,
  house: Pick<House, "assistants">,
  actor: string,
): MindDefinition | undefined {
  return definitionsNow(options, house).find(each => each.actor === actor);
}
/** The minds switched on that can think now: an assistant only while enabled and its owner is in the house. */
export function liveDefinitions(
  options: Sources,
  house: Pick<House, "assistants" | "grants">,
  switches: MindSwitches,
): readonly MindDefinition[] {
  return definitionsNow(options, house).filter(definition => {
    if (!enabledMind(switches, definition.actor)) return false;
    if (!definition.actor.startsWith("assistant:")) return true;
    const owner = definition.actor.slice("assistant:".length);
    return house.assistants.get(owner)?.enabled === true && house.grants.has(owner);
  });
}
