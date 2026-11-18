// Declara cómo dar y sacar programas, herramientas y acciones del kit con nombres visibles.
import { holderKit } from "../../house/kit-history.ts";
import { actionSelection, covers, herramientaDe, kitLayout } from "../../house/kit-selection.ts";
import { object } from "../../fields/visible-text.ts";
import { oneOf, option } from "../../fields/fields.ts";
import { allowedAct } from "../../house/kit.ts";
import type { House } from "../../house/members.ts";
import { identityTexts as words } from "../../texts/identities.texts.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import { programAct, type ProgramAct } from "../promises.ts";
import type { Program, Tool, ToolRegistry } from "../tool-contract.ts";
import { targetIdentity } from "./identity-reading.ts";
import { actionName, kitAct, kitCatalog, kitMenu, kitProblem, kitDatum, folderName } from "./kit-catalog.ts";
import { kitEffects } from "./kit-effects.ts";
import { kitCases } from "./kit-cases.ts";
const kitInput = (folder: boolean) =>
  object({
    value: oneOf(
      words.given,
      option("yes", folder ? words.give : words.yes, folder ? "d" : "s"),
      option("no", folder ? words.take : words.no, folder ? "s" : "n"),
    ),
  });
function kitToday(
  house: House,
  holder: string,
  tool: string,
  actions: readonly string[],
  action?: string,
  group?: string,
): { value: "yes" | "no" } | undefined {
  if (action === undefined && kitDatum(house, holder, tool, actions, group) === words.someActions) return undefined;
  const yes =
    action === undefined
      ? kitDatum(house, holder, tool, actions, group) === words.all
      : allowedAct(house, holder, tool, action);
  return { value: yes ? "yes" : "no" };
}
function kitAction<X extends Program>(tool: Tool<X>, key: string, otherMind: boolean, action?: string, group?: string) {
  const actions = Object.keys(tool.acts);
  const input = kitInput(action === undefined);
  const label = action === undefined ? folderName(tool, group) : actionName(tool.acts[action], action);
  const folderLevel = group === undefined ? "program" : "tool";
  const saved = words.saved(label, action !== undefined ? "action" : folderLevel);
  return programAct<X, typeof input>({
    name: label.toLowerCase(),
    enter: "guardar",
    purpose: words.kitPurpose,
    key,
    on: "thing",
    leaves: false,
    undoable: true,
    under: kitMenu(group === undefined ? tool.id : `${tool.id}/${group}`),
    input,
    refuses: [words.only, words.adminAll, words.removed, ...(otherMind ? [words.ownActions] : []), toolTexts.unchanged],
    offered: ({ house }, target) => kitProblem(house, targetIdentity(target), tool.id),
    today: ({ house }, target) => kitToday(house, targetIdentity(target), tool.id, actions, action, group),
    datum: ({ house }, target) => rowDatum(house, targetIdentity(target), tool.id, actions, action, group),
    ...(action === undefined
      ? {}
      : {
          confirms: ({ value }: { value: "yes" | "no" }, { house }: { house: House }, target: string) =>
            value === "no" && inherited(house, targetIdentity(target), tool.id, action) ? words.splitFolder : undefined,
        }),
    run: ({ value }, { state: { house }, by, target }) => ({
      status: "accepted",
      text: saved,
      effects: kitEffects(house, by, targetIdentity(target), tool, action, value === "yes", group),
    }),
    cases: kitCases<X>(tool.id, action, false, group, saved),
  });
}
function inherited(house: House, holder: string, program: string, action: string): boolean {
  return holderKit(house, holder).selections.some(
    selection => selection.kind !== "action" && covers(selection, actionSelection(program, action, house.kitLayout)),
  );
}
export function kitActions<X extends Program>(registry: ToolRegistry<X>): Readonly<Record<string, ProgramAct<X>>> {
  const acts: Record<string, ProgramAct<X>> = {};
  const catalog = kitCatalog(registry);
  const layout = kitLayout(registry);
  for (const tool of catalog) {
    acts[kitAct(tool.id)] = kitAction(tool, "t", catalog.length > 1);
    const groups = [...new Set(Object.keys(tool.acts).map(action => herramientaDe(tool.id, action, layout)))];
    for (const group of groups) {
      acts[kitAct(`${tool.id}/${group}`)] = kitAction(tool, "t", catalog.length > 1, undefined, group);
      Object.keys(tool.acts)
        .filter(action => herramientaDe(tool.id, action, layout) === group)
        .forEach((action, i) => {
          acts[kitAct(tool.id, action)] = kitAction(
            tool,
            i < 9 ? String(i + 1) : "",
            catalog.length > 1,
            action,
            group,
          );
        });
    }
  }
  return acts;
}
export const kitMenus = <X extends Program>(registry: ToolRegistry<X>) =>
  Object.fromEntries(
    kitCatalog(registry).flatMap(tool => {
      const groups = [
        ...new Set(Object.keys(tool.acts).map(action => herramientaDe(tool.id, action, kitLayout(registry)))),
      ];
      return [tool.id, ...groups.map(group => `${tool.id}/${group}`)].map(id => [
        kitMenu(id),
        {
          name: folderName(tool, id === tool.id ? undefined : id.slice(tool.id.length + 1)).toLowerCase(),
          purpose: words.kitPurpose,
          key: "",
        },
      ]);
    }),
  );

function rowDatum(
  house: House,
  holder: string,
  program: string,
  actions: readonly string[],
  action?: string,
  group?: string,
) {
  if (action === undefined) return kitDatum(house, holder, program, actions, group);
  return inherited(house, holder, program, action) ? words.inherited : undefined;
}
