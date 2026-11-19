// The optional core piece uses declarations for reading and actions, and keeps nothing outside House.
import { identityTexts as words } from "../../texts/identities.texts.ts";
import { identitySkill } from "../../texts/tool-skills.texts.ts";
import { assignMindCard } from "../minds/mind-settings-actions.ts";
import { personalRegistry } from "../personal/personal.ts";
import type { ProgramTool } from "../promises.ts";
import { rulesRegistry } from "../rules/rules.ts";
import type { Program, ToolRegistry } from "../tool-contract.ts";
import { assistantActions } from "./assistant-actions.ts";
import { deviceActions } from "./device-actions.ts";
import { doorActions } from "./door-actions.ts";
import { identityActions } from "./identity-actions.ts";
import { identityReading, identityTarget, members } from "./identity-reading.ts";
import { identityScene } from "./identity-scene.ts";
import { kitActions, kitMenus } from "./kit-actions.ts";
import { kitCatalog } from "./kit-catalog.ts";
import { newIdentity } from "./new-identity.ts";
const core = new WeakSet<object>();
export function identitiesTool<X extends Program>(
  registry: ToolRegistry<X>,
  runner: string,
  assistants = true,
): ProgramTool<X> {
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
      ...doorActions<X>(),
      ...deviceActions<X>(),
      ...kitActions(registry),
      ...(assistants ? { ...assistantActions(registry), "assign-mind-card": assignMindCard<X>() } : {}),
    },
  };
  core.add(tool);
  return tool;
}
export function coreRegistry<X extends Program>(
  registry: readonly ProgramTool<X>[],
  runner: string,
  enabled?: boolean,
  assistants?: boolean,
  minds?: readonly string[],
): readonly ProgramTool<X>[];
export function coreRegistry<X extends Program>(
  registry: ToolRegistry<X>,
  runner: string,
  enabled?: boolean,
  assistants?: boolean,
  minds?: readonly string[],
): ToolRegistry<X>;
export function coreRegistry<X extends Program>(
  registry: ToolRegistry<X>,
  runner: string,
  enabled = false,
  assistants = true,
  minds: readonly string[] = [],
) {
  const found = registry.filter(tool => tool.id === "identities");
  if (found.some(tool => !core.has(tool)) || found.length > 1) throw new Error("identities is reserved for the base");
  if (!enabled && found.length) throw new Error("Identities requires the composition's request");
  const ordinary = registry
    .filter(tool => tool.id !== "identities")
    .map(tool => {
      if (!minds.includes(tool.id) || tool.acts["assign-mind-card"]) return tool;
      return { ...tool, acts: { ...tool.acts, "assign-mind-card": assignMindCard<X>(tool.id) } };
    });
  return personalRegistry(
    rulesRegistry(enabled ? [...ordinary, found[0] ?? identitiesTool<X>(ordinary, runner, assistants)] : ordinary),
  );
}
