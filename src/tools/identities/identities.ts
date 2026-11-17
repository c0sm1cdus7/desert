// The optional core piece uses declarations for reading and actions, and keeps nothing outside House.
import type { ProgramTool } from "../promises.ts";
import type { Program, ToolRegistry } from "../tool-contract.ts";
import { identitySkill } from "../../texts/tool-skills.texts.ts";
import { identityTexts as words } from "../../texts/identities.texts.ts";
import { identityScene } from "./identity-scene.ts";
import { assistantActions } from "./assistant-actions.ts";
import { identityActions } from "./identity-actions.ts";
import { newIdentity } from "./new-identity.ts";
import { identityReading, identityTarget, members } from "./identity-reading.ts";
import { kitActions, kitMenus } from "./kit-actions.ts";
import { kitCatalog } from "./kit-catalog.ts";
const core = new WeakSet<object>();
export function identitiesTool<X extends Program>(registry: ToolRegistry<X>, runner: string): ProgramTool<X> {
  const tool: ProgramTool<X> = {
    id: "identities",
    purpose: words.purpose,
    skill: identitySkill,
    targets: ({ house }) =>
      [...members(house), ...kitCatalog(registry).map(tool => `mind:${tool.id}`)].map(identityTarget),
    view: ({ house, by }, target) => identityReading(house, target, registry, by),
    summary: ({ house }) => words.countIdentities(members(house).length),
    menus: kitMenus(registry),
    acts: {
      scene: identityScene<X>(),
      new: newIdentity<X>(registry, runner),
      ...identityActions<X>(runner, registry),
      ...kitActions(registry),
      ...assistantActions(registry),
    },
  };
  core.add(tool);
  return tool;
}
export function coreRegistry<X extends Program>(registry: ToolRegistry<X>, runner: string, enabled = false) {
  const found = registry.filter(tool => tool.id === "identities");
  if (found.some(tool => !core.has(tool)) || found.length > 1) throw new Error("identities is reserved for the base");
  if (!enabled && found.length) throw new Error("Identities requires the composition's request");
  const ordinary = registry.filter(tool => tool.id !== "identities");
  return enabled ? [...ordinary, identitiesTool<X>(ordinary, runner)] : registry;
}
