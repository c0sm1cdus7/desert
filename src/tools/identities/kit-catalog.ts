// Catálogo de kit, nombres, disponibilidad por destinatario, resumen y límite de nueve acciones.
import { allowedAct, mindTool } from "../../house/kit.ts";
import type { House } from "../../house/members.ts";
import type { Program, ToolRegistry } from "../tool-contract.ts";
import { identityTexts as words } from "../../texts/identities.texts.ts";
export const kitMenu = (tool: string) => `kit:${tool}`;
export const kitAct = (tool: string, act?: string) => `${kitMenu(tool)}${act === undefined ? "" : `:${act}`}`;
export const kitCatalog = <X extends Program>(registry: ToolRegistry<X>) =>
  registry.filter(tool => tool.id !== "identities");
// Every editable row counts: identities include the whole tool; minds only include its actions.
export const kitFits = (count: number, whole = false) => count + Number(whole) <= 9;
export function kitDatum(house: House, holder: string, tool: string, actions: readonly string[]) {
  if (holder === house.admin) return words.all;
  if (!actions.length && house.grants.get(holder)?.includes(tool)) return words.all;
  const count = actions.filter(act => allowedAct(house, holder, tool, act)).length;
  if (count === 0) return words.no;
  return count === actions.length ? words.all : words.partial(count, actions.length);
}
export function kitProblem(house: House, holder: string, tool: string, whole: boolean) {
  if (holder === house.admin) return words.adminAll;
  if (house.removed.has(holder)) return words.removed;
  const own = mindTool(holder);
  return own !== undefined && (own !== tool || whole) ? words.ownActions : undefined;
}
export function actionName(action: unknown, fallback: string): string {
  const name: unknown = action && typeof action === "object" ? Reflect.get(action, "name") : undefined;
  return typeof name === "string" ? name : fallback;
}
