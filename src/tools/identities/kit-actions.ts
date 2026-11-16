import { object } from "../../fields/visible-text.ts";
import { oneOf, option } from "../../fields/fields.ts";
import { allowedAct, mindTool } from "../../house/kit.ts";
import type { House } from "../../house/members.ts";
import { identityTexts as words } from "../../texts/identities.texts.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import { programAct, type ProgramAct } from "../promises.ts";
import type { Program, Tool, ToolRegistry } from "../tool-contract.ts";
import { targetIdentity } from "./identity-reading.ts";
import { actionName, kitAct, kitCatalog, kitFits, kitMenu, kitProblem, kitDatum } from "./kit-catalog.ts";
import { kitEffects } from "./kit-effects.ts";
import { kitCases } from "./kit-cases.ts";
const input = object({ value: oneOf(words.given, option("yes", "sí", "s"), option("no", "no", "n")) });
function kitToday(
  house: House,
  holder: string,
  tool: string,
  actions: readonly string[],
  action?: string,
): { value: "yes" | "no" } | undefined {
  const datum = kitDatum(house, holder, tool, actions);
  if (action === undefined && house.grants.get(holder)?.includes(tool) && datum !== words.all) return undefined;
  const yes = action === undefined ? datum === words.all : allowedAct(house, holder, tool, action);
  return { value: yes ? "yes" : "no" };
}
function kitRowDatum(house: House, holder: string, tool: string, actions: readonly string[], action?: string) {
  if (action !== undefined) return undefined;
  const datum = kitDatum(house, holder, tool, actions);
  return datum === words.no && house.grants.get(holder)?.includes(tool) ? words.partial(0, actions.length) : datum;
}
function kitAction<X extends Program>(tool: Tool<X>, key: string, otherMind: boolean, action?: string) {
  const actions = Object.keys(tool.acts);
  const mindOnly = !kitFits(actions.length, true);
  return programAct<X, typeof input>({
    name: action === undefined ? tool.id : actionName(tool.acts[action], action),
    enter: "guardar",
    purpose: words.tools.toLowerCase(),
    key,
    on: "thing",
    leaves: false,
    undoable: true,
    under: kitMenu(tool.id),
    input,
    refuses: [
      words.only,
      ...(!mindOnly ? [words.adminAll, words.removed] : []),
      ...(mindOnly || action === undefined || otherMind ? [words.ownActions] : []),
      toolTexts.unchanged,
    ],
    offered: ({ house }, target) =>
      mindOnly && !mindTool(targetIdentity(target))
        ? words.ownActions
        : kitProblem(house, targetIdentity(target), tool.id, action === undefined),
    today: ({ house }, target) => kitToday(house, targetIdentity(target), tool.id, actions, action),
    datum: ({ house }, target) => kitRowDatum(house, targetIdentity(target), tool.id, actions, action),
    run: ({ value }, { state: { house }, by, target }) => ({
      status: "accepted",
      text: words.saved(tool.id),
      effects: kitEffects(house, by, targetIdentity(target), tool, action, value === "yes"),
    }),
    cases: kitCases<X>(tool.id, action, mindOnly),
  });
}
export function kitActions<X extends Program>(registry: ToolRegistry<X>): Readonly<Record<string, ProgramAct<X>>> {
  const acts: Record<string, ProgramAct<X>> = {};
  const catalog = kitCatalog(registry);
  for (const tool of catalog.filter(tool => kitFits(Object.keys(tool.acts).length))) {
    if (kitFits(Object.keys(tool.acts).length, true)) acts[kitAct(tool.id)] = kitAction(tool, "t", true);
    Object.keys(tool.acts).forEach((act, i) => {
      acts[kitAct(tool.id, act)] = kitAction(tool, String(i + 1), catalog.length > 1, act);
    });
  }
  return acts;
}
export const kitMenus = <X extends Program>(registry: ToolRegistry<X>) =>
  Object.fromEntries(
    kitCatalog(registry)
      .filter(tool => kitFits(Object.keys(tool.acts).length))
      .map((tool, i) => [kitMenu(tool.id), { name: tool.id, purpose: words.tools.toLowerCase(), key: String(i + 1) }]),
  );
