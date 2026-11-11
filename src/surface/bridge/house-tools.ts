// A house's tools as a surface sees them: what is read comes from the house, and every change goes through its acts.
import { allowed, hides } from "../../house/house.ts";
import { genericTexts as generic } from "../../texts/generic-surface.texts.ts";
import type { ProgramTool } from "../../tools/promises.ts";
import type { Program, Tool as HouseTool } from "../../tools/tool-contract.ts";
import type { Tool, ViewRow } from "../shown-tool.ts";
import type { Option } from "../contract.ts";
import { backKey as back } from "../screen.ts";
import type { Things } from "./asking.ts";
import { anyToolScreen } from "./any-tool.ts";
import type { HousePorts, Shown, SurfacePorts } from "./house-ports.ts";
import { noticesOf } from "./notices.ts";
import { preferencesPlace, preferencesTool } from "./preferences-tool.ts";
import { programActs } from "./program-acts.ts";

/** Only a tool whose acts say how they are offered can be shown: an act without its declaration is a defect. */
const isProgramTool = <X extends Program>(tool: HouseTool<X>): tool is ProgramTool<X> =>
  Object.values(tool.acts).every(act => "label" in act && "key" in act && "cases" in act);
const repeated = (keys: readonly string[]): string[] => keys.filter((key, index) => keys.indexOf(key) !== index);
/** Every option is reached by a key of its own where it is offered: two with the same key is a defect. */
function audit<X extends Program>(tools: readonly ProgramTool<X>[], shown: Shown<X>): void {
  const wordless = tools.filter(tool => !shown.words[tool.id]).map(tool => tool.id);
  if (wordless.length) throw new Error(`No words for the tools ${wordless.join(", ")}`);
  const taken = repeated([preferencesPlace.key, ...tools.map(tool => shown.words[tool.id]?.key ?? "")]);
  if (taken.length) throw new Error(`Two tools take the same key: ${taken.join(", ")}`);
  if (tools.some(tool => tool.id === preferencesPlace.id)) throw new Error(`A tool takes the name of Preferences`);
  tools.forEach(auditActs);
  for (const tool of tools) {
    const also = tools.flatMap(other => Object.values(other.acts).filter(act => act.also?.tool === tool.id));
    const own = Object.values(tool.acts).filter(act => act.on === "thing" && act.under === undefined);
    const keys = repeated([...own, ...Object.values(tool.menus ?? {}), ...also].map(option => option.key));
    if (keys.length) throw new Error(`Two acts on a thing of ${tool.id} take the same key: ${keys.join(", ")}`);
  }
  const astray = tools.flatMap(tool =>
    Object.values(tool.acts)
      .filter(act => act.also && (act.on !== "tool" || !tools.some(other => other.id === act.also?.tool)))
      .map(act => `${tool.id} ${act.label}`),
  );
  if (astray.length)
    throw new Error(`Acts offered on things that are not a tool's own act or name no tool: ${astray.join(", ")}`);
}
/** The acts of one tool, where each is taken: on the tool, among a thing's actions with its menus, or under a menu. */
function auditActs<X extends Program>(tool: ProgramTool<X>): void {
  const acts = Object.values(tool.acts);
  const menus = Object.entries(tool.menus ?? {});
  /** Where an act asks to be confirmed, its own key takes it and this one goes back: they cannot be the same. */
  if (acts.some(act => act.key === back)) throw new Error(`An act of ${tool.id} takes the key that goes back: ${back}`);
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
/** The things of a tool as an answer picks them: only of a tool this identity holds, found the way its menu finds. */
const thingsOf =
  <X extends Program>(ports: HousePorts<X>, tools: readonly ProgramTool<X>[], shown: () => readonly Tool[]) =>
  (id: string): Things | undefined => {
    const tool = shown().find(known => known.id === id);
    const contract = tools.find(known => known.id === id);
    if (!tool?.find || !contract || tool.off?.() !== undefined) return undefined;
    return {
      found: sought => (tool.find?.(sought) ?? []).flatMap(row => (row.opens ? [picked(row, row.opens)] : [])),
      shown: thing => tool.titleOf?.(thing) ?? thing,
      has: thing => contract.targets(ports.state()).includes(thing),
    };
  };
export function houseTools<X extends Program>(ports: HousePorts<X>, shown: Shown<X>): readonly Tool[] {
  const seen = new Map<string, number>();
  const observed: SurfacePorts<X> = { ...ports, act: value => ports.act(value, seen.get(value.target ?? "") ?? 0) };
  const undeclared = ports.registry.filter(tool => !isProgramTool(tool)).map(tool => tool.id);
  if (undeclared.length) throw new Error(`Acts without their declaration in ${undeclared.join(", ")}`);
  const tools = ports.registry.filter(isProgramTool);
  audit(tools, shown);
  const asked = { locale: shown.locale, things: thingsOf(ports, tools, () => own) };
  const built = tools.flatMap(contract => {
    const words = shown.words[contract.id];
    return words ? [{ contract, words, ...programActs(observed, contract, asked) }] : [];
  });
  const own: Tool[] = built.map(({ contract, words, acts, start }) => {
    const mine = (): boolean => allowed(ports.state().house, ports.me, contract.id);
    const tool = (shown.screens?.[contract.id] ?? anyToolScreen)(observed, contract, words, acts, start);
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
