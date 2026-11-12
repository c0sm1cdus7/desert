// A house's tools as a surface sees them: what is read comes from the house, and every change goes through its acts.
import { thingView } from "./presented.ts";
import { allowed, hides } from "../../house/house.ts";
import { genericTexts as generic } from "../../texts/generic-surface.texts.ts";
import type { ProgramTool } from "../../tools/promises.ts";
import type { Program, State, Tool as HouseTool } from "../../tools/tool-contract.ts";
import type { Tool, ViewRow } from "../shown-tool.ts";
import type { Option } from "../contract.ts";
import { backKey as back } from "../screen.ts";
import type { Things } from "./asking.ts";
import { anyToolScreen } from "./any-tool.ts";
import type { HousePorts, Shown, SurfacePorts, ToolWords } from "./house-ports.ts";
import { noticesOf } from "./notices.ts";
import { preferencesPlace, preferencesTool } from "./preferences-tool.ts";
import { programActs } from "./program-acts.ts";

/** Only a tool whose acts say how they are offered can be shown: an act without its declaration is a defect. */
const isProgramTool = <X extends Program>(tool: HouseTool<X>): tool is ProgramTool<X> =>
  Object.values(tool.acts).every(act => "name" in act && "enter" in act && "key" in act && "cases" in act);
const repeated = (keys: readonly string[]): string[] => keys.filter((key, index) => keys.indexOf(key) !== index);
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
  tools.forEach(tool => auditData(tool, shown.words[tool.id]?.reads ?? {}));
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
/** The act of a tool that makes a new thing of it, as an option where its things are picked: with its key and what
 * it is for, as on the tool's own list. Nothing while the tool says it cannot be done. */
function madeBy<X extends Program>(tool: ProgramTool<X>, act: string, state: State<X>): Option | undefined {
  const declared = tool.acts[act];
  if (declared?.on !== "tool") throw new Error(`${tool.id} has no act ${act} that makes a thing of it`);
  if (declared.offered?.(state, tool.id) !== undefined) return undefined;
  return { title: declared.name, detail: declared.purpose, key: declared.key, makes: { tool: tool.id, act } };
}
/** A row that leads to a thing, as an option that picks it. */
const picked = ({ title, detail }: ViewRow, value: string): Option => ({ title, ...(detail ? { detail } : {}), value });
/** The things of a tool as an answer picks them: only of a tool this identity holds, found the way its menu finds. */
const thingsOf =
  <X extends Program>(ports: HousePorts<X>, { words }: Shown<X>, shown: () => readonly Tool[]) =>
  (id: string): Things | undefined => {
    const tool = shown().find(known => known.id === id);
    const contract = ports.registry.filter(isProgramTool).find(known => known.id === id);
    if (!tool?.find || !contract) return undefined;
    /** The things of a tool this identity does not hold are out of reach: none is found, and it says why. */
    const why = tool.off?.();
    if (why !== undefined) return { found: () => [], shown: thing => thing, has: () => false, empty: why };
    const open = (thing: string): boolean => contract.closed?.(ports.state(), thing) !== true;
    return {
      empty: words[id]?.empty ?? "",
      found: sought =>
        (tool.find?.(sought) ?? []).flatMap(row => (row.opens && open(row.opens) ? [picked(row, row.opens)] : [])),
      shown: thing => tool.titleOf?.(thing) ?? thing,
      has: thing => contract.targets(ports.state()).includes(thing) && open(thing),
      make: act => madeBy(contract, act, ports.state()),
    };
  };
/** An instant as the journal keeps it, for a program that does not say how its country writes one. */
const plainMoment = (at: number): string => new Date(at).toISOString().slice(0, 16).replace("T", " ");
/** One of its things is always read as its tool declared: no screen of a program draws a thing. */
function withThings<X extends Program>(
  ports: SurfacePorts<X>,
  contract: ProgramTool<X>,
  { words, shown }: Readonly<{ words: ToolWords; shown: Shown<X> }>,
  screen: Tool,
): Tool {
  const moment = shown.moment ?? plainMoment;
  const declared = thingView(ports, contract, words.presents);
  /** After what its tool declared, a thing reads everything that was done to it: newest first, as the journal has
   * it, with who did it and when. A thing nothing was done to (it is there by itself) has no such list. */
  const record = (target: string) => {
    const done = ports.state().entries.filter(entry => entry.data.target === target && entry.data.draft !== true);
    const rows = done
      .toReversed()
      .map(entry => ({ title: entry.data.text, detail: `${entry.data.author} · ${moment(entry.at)}`, still: true }));
    return rows.length ? [{ ...generic.record, reads: true as const, rows }] : [];
  };
  const thing = (target: string) => [...declared(target), ...record(target)];
  const isThing = (target?: string): target is string =>
    target !== undefined && contract.targets(ports.state()).includes(target);
  /** Its things are its own, whatever screen shows it: a row of any tool that names one of them leads here. */
  const has = (target: string): boolean | undefined => screen.has?.(target) ?? (isThing(target) || undefined);
  return { ...screen, has, view: target => (isThing(target) ? thing(target) : screen.view(target)) };
}
export function houseTools<X extends Program>(ports: HousePorts<X>, shown: Shown<X>): readonly Tool[] {
  const seen = new Map<string, number>();
  const observed: SurfacePorts<X> = { ...ports, act: value => ports.act(value, seen.get(value.target ?? "") ?? 0) };
  const undeclared = ports.registry.filter(tool => !isProgramTool(tool)).map(tool => tool.id);
  if (undeclared.length) throw new Error(`Acts without their declaration in ${undeclared.join(", ")}`);
  const tools = ports.registry.filter(isProgramTool);
  audit(tools, shown);
  const titled = (tool: string, target: string) => own.find(known => known.id === tool)?.titleOf?.(target) ?? target;
  const asked = { locale: shown.locale, things: thingsOf(ports, shown, () => own), titled };
  const built = tools.flatMap(contract => {
    const words = shown.words[contract.id];
    return words ? [{ contract, words, ...programActs(observed, contract, asked) }] : [];
  });
  const own: Tool[] = built.map(({ contract, words, acts, start }) => {
    const mine = (): boolean => allowed(ports.state().house, ports.me, contract.id);
    const screen = shown.screens?.[contract.id] ?? anyToolScreen;
    const tool = withThings(observed, contract, { words, shown }, screen(observed, contract, words, acts, start));
    const calls = () => ports.state().attention.has(contract.id);
    const { notices, seen: looked } = noticesOf(observed, contract, tool);
    /** What the other tools offer on a thing of this one: only on a thing, never on a view that groups them. */
    const others = built.filter(other => other.contract.id !== contract.id);
    const alsoOn = (target: string): ViewRow[] =>
      contract.targets(ports.state()).includes(target)
        ? others.flatMap(other => other.offers(contract.id, target))
        : [];
    return {
      ...tool,
      notices,
      alsoOn,
      off: () => (mine() ? undefined : generic.notHeld),
      /** A tool nobody gave you is on your Menu unless you prefer not to see what is not yours. */
      listed: () => mine() || !hides(ports.state().house, ports.me, "foreign"),
      calls,
      rendered: (target = contract.id) => {
        seen.set(target, ports.state().through);
        // Looking at what called you is attending it, the same act anyone does.
        if (calls()) ports.act({ act: "attend", input: { target: contract.id } }, 0);
        looked(target);
      },
    };
  });
  return [...own, preferencesTool(observed)];
}
