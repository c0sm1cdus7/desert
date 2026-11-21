// Resolves the minds of the house as it is now: the distribution's program minds, one per assistant, the supervisor.
import { assistantOf } from "../../fields/mind-actor.ts";
import type { House } from "../../house/members.ts";
import { assistantMindRules } from "../../texts/program-mind.texts.ts";
import { supervisorRules } from "../../texts/supervisor.texts.ts";
import { ids } from "../../house/ids.ts";
import type { MindDefinition } from "../../tools/minds/mind-contract.ts";
import { enabledMind, type MindRuntimeOptions, type MindSwitches } from "./mind-runtime-options.ts";
type Sources = Pick<MindRuntimeOptions, "definitions" | "talk">;
/** One supervisor per house; composition reserves the program id, so no program mind can take this actor. */
export const supervisorActor = ids.supervisor;
const made = new WeakMap<Sources, Map<string, MindDefinition>>();
const supervisors = new WeakMap<Sources, MindDefinition>();
/** The supervisor thinks as itself, with its scene and the talk acts: the only programs it may act on (21/11). It
 * is no assistant and no program mind, so the card catalog, the bank and the switches never list it. */
function supervisorDefinition(options: Sources): MindDefinition {
  const known = supervisors.get(options);
  if (known) return known;
  const definition: MindDefinition = Object.freeze({
    actor: supervisorActor,
    role: "supervisor",
    rules: supervisorRules,
    communication: Object.freeze([{ tool: "mind", act: "scene" }, ...(options.talk ?? [])]),
  });
  supervisors.set(options, definition);
  return definition;
}
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
  if (actor === supervisorActor) return supervisorDefinition(options);
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
