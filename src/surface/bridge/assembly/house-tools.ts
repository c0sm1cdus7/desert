// A house's tools as a surface sees them: what is read comes from the house, and every change goes through its acts.
import { kitScreen } from "../../../tools/identities/kit-screen.ts";
import { withIdentityWords } from "../../../tools/identities/identity-reading.ts";
import { observedPorts } from "../ports/observed-ports.ts";
import { programCall } from "../../../fields/program-call.ts";
import { builtScreen } from "../views/program-screen.ts";
import { thingView } from "../views/presented.ts";
import { allowed } from "../../../house/kit.ts";
import { hides } from "../../../house/members.ts";
import type { ProgramTool } from "../../../tools/promises.ts";
import type { Program, Tool as HouseTool } from "../../../tools/tool-contract.ts";
import type { Tool, ViewRow } from "../../contract/shown-tool.ts";
import type { Option } from "../../contract/contract.ts";
import { backKey as back } from "../../session/screen.ts";
import type { Things } from "../questions/asking.ts";
import { auditFields } from "./audit-fields.ts";
import {
  listsOf,
  ownReads,
  type HousePorts,
  type Shown,
  type SurfacePorts,
  type ToolWords,
} from "../ports/house-ports.ts";
import { makerOptions } from "../picking/makers.ts";
import { noticesOf } from "../views/notices.ts";
import { preferencesPlace, preferencesTool } from "./preferences-tool.ts";
import { programActs } from "../acts/program-acts.ts";
import { toolTexts } from "../../../texts/tools.texts.ts";
import { recordOf } from "../views/record.ts";
/** Only a tool whose acts say how they are offered can be shown: an act without its declaration is a defect. */
const isProgramTool = <X extends Program>(tool: HouseTool<X>): tool is ProgramTool<X> =>
  Object.values(tool.acts).every(act => "name" in act && "enter" in act && "key" in act && "cases" in act);
const repeated = (keys: readonly string[]): string[] =>
  keys.filter((key, index) => key !== "" && keys.indexOf(key) !== index);
/** What can be changed is changed where it is read: an act that is named as a datum its tool reads is taken from
 * the row of that datum. Listed among the actions it would say the datum twice. */
function auditData<X extends Program>(tool: ProgramTool<X>, reads: Readonly<Record<string, string>>): void {
  const labels = Object.values(reads).map(label => label.toLowerCase());
  for (const [name, act] of Object.entries(tool.acts)) {
    /** What is done to a thing is among its actions: only what a tool itself reads is changed where it is read. */
    if (act.changes !== undefined && act.on === "thing")
      throw new Error(`${name} of ${tool.id} changes a datum of a thing: it goes among the actions of the thing`);
    if (act.changes !== undefined && reads[act.changes] === undefined)
      throw new Error(`${name} of ${tool.id} changes a datum its tool does not read: ${act.changes}`);
    const loose = act.changes === undefined && act.under === undefined && labels.includes(act.name.toLowerCase());
    if (loose)
      throw new Error(`${name} of ${tool.id} changes a datum its tool reads: it is taken from that datum's row`);
  }
}
/** Tools are told apart by their key where they are listed: on the Menu, or in the tool they live in, where the
 * acts taken on that tool are listed too. A tool lives in one that is on the Menu. */
function auditPlaces<X extends Program>(tools: readonly ProgramTool<X>[], shown: Shown<X>): void {
  const wordsOf = (tool: ProgramTool<X>) => shown.words[tool.id];
  const onMenu = tools.filter(tool => wordsOf(tool)?.inside === undefined);
  const taken = repeated([preferencesPlace.key, ...onMenu.map(tool => wordsOf(tool)?.key ?? "")]);
  if (taken.length) throw new Error(`Two tools take the same key: ${taken.join(", ")}`);
  for (const tool of tools) {
    const outer = wordsOf(tool)?.inside;
    if (outer === undefined) continue;
    const home = onMenu.find(known => known.id === outer);
    if (!home) throw new Error(`${tool.id} lives in ${outer}, which is not a tool on the Menu`);
    const siblings = tools.filter(other => wordsOf(other)?.inside === outer).map(other => wordsOf(other)?.key ?? "");
    const acts = Object.values(home.acts).filter(act => act.on === "tool");
    const same = repeated([...siblings, ...acts.map(act => act.key)]);
    if (same.length) throw new Error(`Two rows of ${outer} take the same key: ${same.join(", ")}`);
  }
}
/** Every option is reached by a key of its own where it is offered: two with the same key is a defect. */
function audit<X extends Program>(tools: readonly ProgramTool<X>[], shown: Shown<X>): void {
  const wordless = tools.filter(tool => !shown.words[tool.id]).map(tool => tool.id);
  if (wordless.length) throw new Error(`No words for the tools ${wordless.join(", ")}`);
  auditPlaces(tools, shown);
  if (tools.some(tool => tool.id === preferencesPlace.id)) throw new Error(`A tool takes the name of Preferences`);
  tools.forEach(auditActs);
  auditFields(tools, shown);
  tools.forEach(tool => auditData(tool, ownReads(shown.words[tool.id])));
  for (const tool of tools) {
    const also = tools.flatMap(other => Object.values(other.acts).filter(act => act.also?.tool === tool.id));
    const own = Object.values(tool.acts).filter(act => act.on === "thing" && act.under === undefined);
    const keys = repeated([...own, ...Object.values(tool.menus ?? {}), ...also].map(option => option.key));
    if (keys.length) throw new Error(`Two acts on a thing of ${tool.id} take the same key: ${keys.join(", ")}`);
  }
  const astray = tools.flatMap(tool =>
    Object.values(tool.acts)
      .filter(act => act.also && (act.on !== "tool" || !tools.some(other => other.id === act.also?.tool)))
      .map(act => `${tool.id} ${act.name}`),
  );
  if (astray.length)
    throw new Error(`Acts offered on things that are not a tool's own act or name no tool: ${astray.join(", ")}`);
}
/** The acts of one tool, where each is taken: on the tool, among a thing's actions with its menus, or under a menu. */
function auditActs<X extends Program>(tool: ProgramTool<X>): void {
  const acts = Object.values(tool.acts);
  const menus = Object.entries(tool.menus ?? {});
  /** Where an act asks to be confirmed, the initial of its verb takes it and this one goes back: never the same. */
  if (acts.some(act => act.enter.startsWith(back)))
    throw new Error(`The verb of an act of ${tool.id} starts with the key that goes back: ${back}`);
  const lost = acts.flatMap(act => (act.under !== undefined && !tool.menus?.[act.under] ? [act.under] : []));
  if (lost.length) throw new Error(`Acts of ${tool.id} are under menus it does not declare: ${lost.join(", ")}`);
  const empty = menus.filter(([id]) => !acts.some(act => act.on === "thing" && act.under === id)).map(([id]) => id);
  if (empty.length) throw new Error(`Menus of ${tool.id} have no act of a thing under them: ${empty.join(", ")}`);
  const places = [
    acts.filter(act => act.on === "tool"),
    [...acts.filter(act => act.on === "thing" && act.under === undefined), ...menus.map(([, menu]) => menu)],
    ...menus.map(([id]) => acts.filter(act => act.under === id)),
  ];
  for (const place of places) {
    const keys = repeated(place.map(option => option.key));
    if (keys.length) throw new Error(`Two acts of ${tool.id} take the same key: ${keys.join(", ")}`);
  }
}
/** A row that leads to a thing, as an option that picks it. */
const picked = ({ title, detail }: ViewRow, value: string): Option => ({ title, ...(detail ? { detail } : {}), value });
/** The things of a tool as an answer picks them: found the way its menu finds, whatever the kit. */
const thingsOf = <X extends Program>(ports: HousePorts<X>, { words }: Shown<X>, shown: () => readonly Tool[]) => {
  const make = makerOptions();
  return (id: string): Things | undefined => {
    const tool = shown().find(known => known.id === id);
    const contract = ports.registry.filter(isProgramTool).find(known => known.id === id);
    if (!ports.state().house.grants.has(ports.me) || !tool?.find || !contract) return undefined;
    const open = (thing: string): boolean =>
      programCall(contract.closed?.bind(contract), ports.state(), thing, ports.now()) !== true;
    return {
      empty: listsOf(words[id])?.empty ?? "",
      found: sought =>
        (tool.find?.(sought) ?? []).flatMap(row => (row.opens && open(row.opens) ? [picked(row, row.opens)] : [])),
      shown: thing => tool.titleOf?.(thing) ?? thing,
      has: thing => programCall(contract.targets.bind(contract), ports.state()).includes(thing) && open(thing),
      make: act => make(contract, tool, act),
    };
  };
};
/** One of its things is always read as its tool declared: no screen of a program draws a thing. */
function withThings<X extends Program>(
  ports: SurfacePorts<X>,
  contract: ProgramTool<X>,
  { words, shown }: Readonly<{ words: ToolWords; shown: Shown<X> }>,
  screen: Tool,
): Tool {
  const declared = thingView(ports, contract, listsOf(words)?.presents ?? []);
  const record = recordOf(ports, shown.moment?.bind(shown));
  const thing = (target: string) => [...declared(target), ...record(target)];
  const isThing = (target?: string): target is string =>
    target !== undefined && programCall(contract.targets.bind(contract), ports.state()).includes(target);
  /** Its things are its own, whatever screen shows it: a row of any tool that names one of them leads here. */
  const has = (target: string): boolean | undefined => screen.has?.(target) ?? (isThing(target) || undefined);
  return { ...screen, has, view: target => (isThing(target) ? thing(target) : screen.view(target)) };
}
/** The program's calendar keeps its receiver; reference readers resolve the assembled tools lazily. */
export function questionsFor<X extends Program>(ports: HousePorts<X>, shown: Shown<X>, tools: () => readonly Tool[]) {
  return {
    locale: shown.locale,
    day: shown.day?.bind(shown),
    things: thingsOf(ports, shown, tools),
    titled: (tool: string, target: string) =>
      tools()
        .find(known => known.id === tool)
        ?.titleOf?.(target) ?? target,
  };
}
function declaredTools<X extends Program>(registry: readonly HouseTool<X>[]) {
  const undeclared = registry.filter(tool => !isProgramTool(tool)).map(tool => tool.id);
  if (undeclared.length) throw new Error(`Acts without their declaration in ${undeclared.join(", ")}`);
  return registry.filter(isProgramTool);
}
export function houseTools<X extends Program>(ports: HousePorts<X>, given: Shown<X>): readonly Tool[] {
  const shown = withIdentityWords(ports.registry, given);
  const seen = new Map<string, number>();
  const observed = observedPorts(ports, seen);
  const tools = declaredTools(ports.registry);
  audit(tools, shown);
  const asked = questionsFor(ports, shown, () => own);
  const built = tools.flatMap(contract => {
    const words = shown.words[contract.id];
    return words ? [{ contract, words, ...programActs(observed, contract, asked) }] : [];
  });
  const own: Tool[] = built.map(({ contract, words, acts, start }) => {
    const mine = (): boolean => allowed(ports.state().house, ports.me, contract.id);
    const screen = builtScreen(shown.screens?.[contract.id], observed, contract, words, acts, start);
    const tool = kitScreen(observed, contract, withThings(observed, contract, { words, shown }, screen), start);
    const calls = () => ports.state().attention.has(contract.id);
    const { notices, seen: looked } = noticesOf(observed, contract, tool);
    /** What the other tools offer on a thing of this one: only on a thing, never on a view that groups them. */
    const others = built.filter(other => other.contract.id !== contract.id);
    const alsoOn = (target: string): ViewRow[] =>
      programCall(contract.targets.bind(contract), ports.state()).includes(target)
        ? others.flatMap(other => other.offers(contract.id, target))
        : [];
    return {
      ...tool,
      notices,
      off: () => (ports.state().house.grants.has(ports.me) ? undefined : toolTexts.unassigned),
      alsoOn,
      /** A tool nobody gave you is on your Menu unless you prefer not to see what is not yours. */
      listed: () => contract.id === "identities" || mine() || !hides(ports.state().house, ports.me, "foreign"),
      calls,
      rendered: (target = contract.id) => {
        if (!ports.state().house.grants.has(ports.me)) return;
        seen.set(target, ports.state().through);
        // Looking at what called you is attending it, the same act anyone does.
        if (calls()) observed.observe?.({ act: "attend", input: { target: contract.id } });
        looked(target);
      },
    };
  });
  return [...own, preferencesTool(observed)];
}
