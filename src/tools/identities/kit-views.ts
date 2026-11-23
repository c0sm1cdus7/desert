// Walks holders, programs, tools and actions through navigable lists with no numeric cap.
import { sceneReading } from "./scene-reading.ts";
import { mindMayHold, mindTool } from "../../house/kit.ts";
import { migrateKit } from "../../house/kit-migration.ts";
import { storedHolderKit } from "../../house/kit-history.ts";
import { toolOf, kitLayout, selectionPath } from "../../house/kit-selection.ts";
import { selectionProblem } from "../../house/kit-validation.ts";
import { MissingView } from "../../surface/contract/missing-view.ts";
import { say, section, type Start, type SurfacePorts } from "../../surface/bridge/ports/house-ports.ts";
import { menuTarget } from "../../surface/bridge/acts/program-acts.ts";
import type { Tool, ViewRow } from "../../surface/contract/shown-tool.ts";
import type { ProgramTool } from "../promises.ts";
import type { Program } from "../tool-contract.ts";
import { wordsIn, type InLanguage } from "../../fields/phrases.ts";
import { identityTexts } from "../../texts/identities.texts.ts";
import { identityTarget, targetIdentity, members } from "./identity-reading.ts";
import { kitCatalog, kitDatum, kitMenu, programName, folderName } from "./kit-catalog.ts";
const mind = (target: string) => mindTool(targetIdentity(target));
type Words = InLanguage<typeof identityTexts>;
function holderList(plain: Tool, words: Words) {
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
type ViewContext<X extends Program> = {
  ports: SurfacePorts<X>;
  contract: ProgramTool<X>;
  plain: Tool;
  start: Start;
} & {
  words: Words;
};
function unavailableRows<X extends Program>({ ports, words }: ViewContext<X>, owner: string): ViewRow[] {
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
    title: say(ports, programName(tool)),
    detail: say(ports, kitDatum(ports.state().house, targetIdentity(holder), tool.id, Object.keys(tool.acts))),
    opens: menuTarget(holder, kitMenu(tool.id)),
  }));
}
/** A mind's own page also opens the programs minds talk through, so the admin can give them from there. */
function talkSection<X extends Program>(ctx: ViewContext<X>, holder: string, own: string | undefined, menu?: string) {
  if (!own || menu) return [];
  const house = ctx.ports.state().house;
  const catalog = kitCatalog(ctx.ports.registry);
  const rows = programRows(ctx, holder).filter((_, at) => {
    const tool = catalog[at];
    return !!tool && tool.id !== own && mindMayHold(house, own, tool.id);
  });
  return rows.length ? [section(ctx.words.programs, rows, ctx.words.emptyKit)] : [];
}
/** The program whose kit this holder may be given: any member's, or a mind's own and the talk programs. */
function holdable<X extends Program>({ ports }: ViewContext<X>, holder: string, program?: string) {
  const house = ports.state().house;
  const own = mind(holder);
  const tool = kitCatalog(ports.registry).find(tool => tool.id === program);
  if (!tool) return undefined;
  if (own !== undefined) return mindMayHold(house, own, tool.id) ? tool : undefined;
  return members(house).includes(targetIdentity(holder)) ? tool : undefined;
}
/** One folder of a program's acts in a holder's kit: what it is called, what of it the holder holds. */
function folderRow<X extends Program>(
  { ports }: ViewContext<X>,
  holder: string,
  tool: ReturnType<typeof kitCatalog<X>>[number],
  group: string,
): ViewRow {
  const held = kitDatum(ports.state().house, targetIdentity(holder), tool.id, Object.keys(tool.acts), group);
  return {
    title: say(ports, folderName(tool, group)),
    detail: say(ports, held),
    opens: menuTarget(holder, kitMenu(`${tool.id}/${group}`)),
  };
}
function branchView<X extends Program>(ctx: ViewContext<X>, target: string, branch: string, notices: ViewRow[]) {
  const { ports, contract, plain, start, words } = ctx;
  const [holder = "", menu] = target.split("#");
  const [program, group] = branch.split("/");
  const own = mind(holder);
  const tool = holdable(ctx, holder, program);
  if (!tool) throw new MissingView(contract.id, target);
  const groups = [...new Set(Object.keys(tool.acts).map(action => toolOf(tool.id, action, kitLayout(ports.registry))))];
  if (group !== undefined && !groups.includes(group)) throw new MissingView(contract.id, target);
  const folders = group === undefined ? groups.map(group => folderRow(ctx, holder, tool, group)) : [];
  const acts = Object.entries(contract.acts)
    .filter(([, act]) => act.under === kitMenu(branch))
    .map(([name, act]) =>
      start(
        name,
        holder,
        name.slice(4).includes(":") ? { today: act.today?.(ports.state(), holder, ports.now()) } : {},
      ),
    );
  const scene =
    own && !menu
      ? sceneReading(plain.view(target), ports.language).filter(
          stack => stack.title === words.sceneTitle && stack.rows.length > 0,
        )
      : [];
  return [
    ...scene,
    section(say(ports, folderName(tool, group)), [...notices, ...folders], words.emptyActions),
    section(words.actions, acts, words.emptyActions),
    ...talkSection(ctx, holder, own, menu),
  ];
}
function targetView<X extends Program>(ctx: ViewContext<X>, target: string) {
  const { ports, contract, plain, words } = ctx;
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
  return branch
    ? branchView(ctx, target, branch, [...notices, ...unavailable])
    : sceneReading(plain.view(target), ports.language);
}
export function kitView<X extends Program>(
  ports: SurfacePorts<X>,
  contract: ProgramTool<X>,
  plain: Tool,
  start: Start,
): Tool["view"] {
  const ctx = { ports, contract, plain, start, words: wordsIn(identityTexts, ports.language) };
  return target => (target === undefined ? holderList(plain, ctx.words) : targetView(ctx, target));
}
