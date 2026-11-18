// Recorre titulares, programas, herramientas y acciones mediante listas navegables sin tope numérico.
import { sceneReading } from "./scene-reading.ts";
import { mindTool } from "../../house/kit.ts";
import { migrateKit } from "../../house/kit-migration.ts";
import { storedHolderKit } from "../../house/kit-history.ts";
import { herramientaDe, kitLayout, selectionPath } from "../../house/kit-selection.ts";
import { selectionProblem } from "../../house/kit-validation.ts";
import { MissingView } from "../../surface/contract/missing-view.ts";
import { section, type Start, type SurfacePorts } from "../../surface/bridge/ports/house-ports.ts";
import { menuTarget } from "../../surface/bridge/acts/program-acts.ts";
import type { Tool, ViewRow } from "../../surface/contract/shown-tool.ts";
import type { ProgramTool } from "../promises.ts";
import type { Program } from "../tool-contract.ts";
import { identityTexts as words } from "../../texts/identities.texts.ts";
import { identityTarget, targetIdentity, members } from "./identity-reading.ts";
import { kitCatalog, kitDatum, kitMenu } from "./kit-catalog.ts";
const mind = (target: string) => mindTool(targetIdentity(target));
function holderList(plain: Tool) {
  const listed = plain.view().flatMap(stack => stack.rows);
  return [
    section(
      words.name,
      listed.filter(row => !row.opens || !mind(row.opens)),
      words.empty,
    ),
    section(
      words.minds,
      listed.filter(row => row.opens && mind(row.opens)),
      words.emptyMinds,
    ),
  ];
}
type ViewContext<X extends Program> = { ports: SurfacePorts<X>; contract: ProgramTool<X>; plain: Tool; start: Start };
function unavailableRows<X extends Program>({ ports }: ViewContext<X>, owner: string): ViewRow[] {
  const house = ports.state().house;
  return storedHolderKit(house, owner)
    .selections.filter(selection => {
      const mapped = migrateKit({ version: 2, selections: [selection] }, house.kitMigration);
      return !mapped.selections.length || selectionProblem(mapped, ports.registry);
    })
    .map(selection => ({ title: selectionPath(selection), detail: words.retired, off: true }));
}
function programRows<X extends Program>({ ports }: ViewContext<X>, holder: string): ViewRow[] {
  return kitCatalog(ports.registry).map(tool => ({
    title: tool.id,
    detail: kitDatum(ports.state().house, targetIdentity(holder), tool.id, Object.keys(tool.acts)),
    opens: menuTarget(holder, kitMenu(tool.id)),
  }));
}
function branchView<X extends Program>(ctx: ViewContext<X>, target: string, branch: string, notices: ViewRow[]) {
  const { ports, contract, plain, start } = ctx;
  const [holder = "", menu] = target.split("#");
  const [program, group] = branch.split("/");
  const tool = kitCatalog(ports.registry).find(tool => tool.id === program);
  const own = mind(holder);
  if (!tool || (own && own !== program) || (!own && !members(ports.state().house).includes(targetIdentity(holder))))
    throw new MissingView(contract.id, target);
  const groups = [
    ...new Set(Object.keys(tool.acts).map(action => herramientaDe(tool.id, action, kitLayout(ports.registry)))),
  ];
  if (group !== undefined && !groups.includes(group)) throw new MissingView(contract.id, target);
  const folders =
    group === undefined
      ? groups.map(group => ({
          title: group,
          detail: kitDatum(ports.state().house, targetIdentity(holder), tool.id, Object.keys(tool.acts), group),
          opens: menuTarget(holder, kitMenu(`${program}/${group}`)),
        }))
      : [];
  const acts = Object.entries(contract.acts)
    .filter(([, act]) => act.under === kitMenu(branch))
    .map(([name, act]) => start(name, holder, { today: act.today?.(ports.state(), holder, ports.now()) }));
  const scene =
    own && !menu
      ? sceneReading(plain.view(target)).filter(stack => stack.title === words.sceneTitle && stack.rows.length > 0)
      : [];
  return [
    ...scene,
    section(group ?? tool.id, [...notices, ...folders], words.emptyActions),
    section(words.actions, acts, words.emptyActions),
  ];
}
function targetView<X extends Program>(ctx: ViewContext<X>, target: string) {
  const { ports, contract, plain } = ctx;
  const [holder = "", menu] = target.split("#");
  const owner = targetIdentity(holder);
  const own = mind(holder);
  const notices: ViewRow[] = owner === ports.state().house.admin ? [{ title: words.adminKitNotice }] : [];
  const unavailable = unavailableRows(ctx, owner);
  if (menu === "tools") {
    if (!members(ports.state().house).map(identityTarget).includes(holder)) throw new MissingView(contract.id, target);
    return [section(words.programs, [...notices, ...programRows(ctx, holder), ...unavailable], words.emptyKit)];
  }
  if (own && menu && !menu.startsWith("kit:")) throw new MissingView(contract.id, target);
  const branch = menu?.startsWith("kit:") ? menu.slice(4) : own;
  return branch ? branchView(ctx, target, branch, [...notices, ...unavailable]) : sceneReading(plain.view(target));
}
export function kitView<X extends Program>(
  ports: SurfacePorts<X>,
  contract: ProgramTool<X>,
  plain: Tool,
  start: Start,
): Tool["view"] {
  const ctx = { ports, contract, plain, start };
  return target => (target === undefined ? holderList(plain) : targetView(ctx, target));
}
