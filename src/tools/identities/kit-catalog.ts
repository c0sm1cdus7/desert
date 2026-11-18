// Describe programas y carpetas otorgables sin limitar la cantidad de filas.
import { holderKit } from "../../house/kit-history.ts";
import { covers, herramientaDe } from "../../house/kit-selection.ts";
import { allowedAct, mindTool } from "../../house/kit.ts";
import type { House } from "../../house/members.ts";
import type { Program, Tool, ToolRegistry } from "../tool-contract.ts";
import { identityTexts as words } from "../../texts/identities.texts.ts";
export const kitMenu = (tool: string) => `kit:${tool}`;
export const kitAct = (tool: string, act?: string) => `${kitMenu(tool)}${act === undefined ? "" : `:${act}`}`;
export const kitCatalog = <X extends Program>(registry: ToolRegistry<X>) =>
  registry.filter(tool => tool.id !== "identities");
export function kitDatum(house: House, holder: string, tool: string, actions: readonly string[], group?: string) {
  if (holder === house.admin) return words.all;
  const branch =
    group === undefined
      ? { kind: "program" as const, program: tool }
      : { kind: "tool" as const, program: tool, tool: group };
  if (holderKit(house, holder).selections.some(selection => covers(selection, branch))) return words.all;
  const count = actions.filter(
    act =>
      (group === undefined || herramientaDe(tool, act, house.kitLayout) === group) &&
      allowedAct(house, holder, tool, act),
  ).length;
  return count ? words.someActions : words.noActions;
}
export function kitProblem(house: House, holder: string, tool: string) {
  if (holder === house.admin) return words.adminAll;
  if (house.removed.has(holder)) return words.removed;
  const own = mindTool(holder);
  return own !== undefined && own !== tool ? words.ownActions : undefined;
}
export function actionName(action: unknown, fallback: string): string {
  const name: unknown = action && typeof action === "object" ? Reflect.get(action, "name") : undefined;
  return typeof name === "string" ? name : fallback;
}

export const programName = <X extends Program>(tool: Tool<X>) => tool.name ?? tool.id;
export const folderName = <X extends Program>(tool: Tool<X>, group?: string) =>
  group === undefined
    ? programName(tool)
    : (tool.toolNames?.[group] ?? (group === tool.id ? programName(tool) : group));
