import { walked, type Asked } from "./actions/asked-act.ts";
import { OutsideDefect } from "../../tools/outside.ts";
import { programCall } from "../../tools/boundaries/program-call.ts";
// The acts of a program's tool as a surface offers them: each asked from its declaration, where it stands.
import { hides } from "../../house/house.ts";
import { genericTexts as generic } from "../../texts/generic-surface.texts.ts";
import { aid, worded } from "../../tools/act-words.ts";
import type { ProgramTool } from "../../tools/promises.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { actionOff } from "../availability/action-off.ts";
import type { ThingAct, ThingMenu, ToolAct, ViewRow } from "../shown-tool.ts";
import { maskOf } from "../screen.ts";
import { type Asking } from "./asking.ts";
import type { ScreenActs, Start, SurfacePorts } from "./house-ports.ts";

/** Where a menu of a thing is read: a destination of its tool that is not a thing of it. */
export const menuTarget = (target: string, menu: string): string => `${target}#${menu}`;
export { capital } from "./actions/asked-act.ts";
type Walked<X extends Program> = ReturnType<typeof walked<X>>;
/** What a thing has today as its row shows it: each answer in the shape of its field. */
const shownOf = (ask: Asking, answers: readonly string[], from: number, until: number, target: string): string =>
  answers
    .slice(from, until)
    .map((answer, index) => maskOf(ask.next(answers.slice(0, from + index), target), answer))
    .filter(Boolean)
    .join(" · ");
/** The row that starts one act of a thing. Given what the thing has today, the act opens on it; and it may ask
 * only one part of it, keeping the rest as it is. */
const starter =
  <X extends Program>(tool: string, entries: readonly Walked<X>[]): Start =>
  (name, target, how = {}) => {
    const found = entries.find(entry => entry.name === name);
    if (!found) throw new OutsideDefect(new Error(`${tool} has no act ${name}`));
    const { act, ask } = found;
    /** An act on the tool itself has no thing to stand on: its row says the tool alone. */
    const on = act.on === "tool" ? { tool } : { tool, target };
    /** A row that names itself is held to what the name of an act is held to: what a row says, in lower case. */
    const title = how.title === undefined ? act.name : programCall(worded, { name: how.title }).name;
    const row = { key: how.key ?? act.key, title, act: name, on };
    if (how.today === undefined) return { ...row, ...(how.detail ? { detail: how.detail } : {}) };
    const answers = ask.answers(how.today);
    const [from, until] = how.asks ?? [0];
    if (from >= (until ?? answers.length) && !act.confirms)
      throw new OutsideDefect(
        new Error(`A row starts ${name} of ${tool} asking nothing, and the act does not ask to be confirmed`),
      );
    const detail =
      how.detail ?? shownOf(ask, answers, from, until ?? answers.length, act.on === "tool" ? tool : target);
    return { ...row, detail, with: { answers, from, ...(until === undefined ? {} : { until }), today: true } };
  };
/** Each menu of the tool among a thing's actions: off while nothing under it can be done, saying why. */
function menusOf<X extends Program>(tool: ProgramTool<X>, shown: Readonly<Record<string, ThingAct>>) {
  const entries = Object.entries(tool.menus ?? {}).map(([id, menu]): [string, ThingMenu] => {
    const under = Object.entries(tool.acts).flatMap(([name, act]) => (act.under === id ? [shown[name]] : []));
    const whys = (target: string) => under.map(act => act?.off?.(target));
    const entry: ThingMenu = {
      label: menu.name,
      key: menu.key,
      purpose: aid(menu.purpose),
      opens: target => menuTarget(target, id),
      listed: target => under.some(act => act?.listed?.(target) ?? true),
      /** Off only while nothing under it can be done, all for one reason: otherwise each says its own inside. */
      off: target =>
        whys(target).every(why => why !== undefined && why === whys(target)[0]) ? whys(target)[0] : undefined,
    };
    return [id, entry];
  });
  return Object.fromEntries(entries);
}
/** The rows a tool's acts put among the actions of a thing of another tool: each starts the act with what that
 * thing already says of it, or stays off saying why that thing does not let it. */
const offersOf =
  <X extends Program>(ports: SurfacePorts<X>, tool: string, entries: readonly Walked<X>[]) =>
  (other: string, target: string): ViewRow[] =>
    entries.flatMap(({ name, act, ask, walk }): ViewRow[] => {
      const { also } = act;
      const given =
        also?.tool === other ? programCall(also.with.bind(also), ports.state(), target, ports.now()) : undefined;
      if (!also || given === undefined) return [];
      const row = { key: act.key, title: also.name ?? act.name, act: name, on: { tool } };
      const fixed = ask.leading(given);
      const why = actionOff(act, ports.state(), tool, tool, ports.now(), () => walk.next(fixed), target, name);
      /** Off, it says why; and it is not there for who prefers not to see what cannot be done. */
      if (why !== undefined && hides(ports.state().house, ports.me, "off")) return [];
      if (why !== undefined) return [{ ...row, detail: why, off: true }];
      /** What the thing suggests comes after what it fixes: those questions open on it, and are still asked. */
      const answers = ask.leading({ ...given, ...programCall(also.opens?.bind(also), ports.state(), target) });
      if (ask.next(fixed) === null && !act.confirms)
        throw new OutsideDefect(
          new Error(`${tool} offers ${name} on ${other} asking nothing, and the act does not ask to be confirmed`),
        );
      /** With no datum of its own here, its row says what the act is for: the list fills that in. */
      const datum = programCall(also.datum?.bind(also), ports.state(), target);
      return [{ ...row, ...(datum ? { detail: datum } : {}), with: { answers, from: fixed.length } }];
    });
/** What an act says to its right when it has no datum of its own: that it cannot be undone, or what it is for.
 * The right of an act is never empty. */
const beside = (act: Readonly<{ undoable: boolean; purpose: string }>): string =>
  act.undoable ? act.purpose : generic.irreversible;
/** Every act of a tool as the surface offers it: on the tool itself, on one of its things, or under a menu. */
export function programActs<X extends Program>(ports: SurfacePorts<X>, tool: ProgramTool<X>, asked: Asked) {
  /** Which hiding preference applies to the identity reading this tool. */
  const entries = Object.entries(tool.acts).map(([name, act]) => walked(ports, { tool: tool.id, name, act }, asked));
  const onTool = entries
    .filter(({ act }) => act.on === "tool")
    .map(({ name, act, walk }): [string, ToolAct] => {
      /** Off for who does not hold the tool, and while the tool itself says why it cannot be done. Hidden, then,
       * for who prefers not to see what is not theirs, or what cannot be done. */
      const off = (): string | undefined =>
        actionOff(act, ports.state(), tool.id, tool.id, ports.now(), () => walk.next([]), undefined, name);
      const listed = (): boolean => off() === undefined || !hides(ports.state().house, ports.me, "off");
      const datum = (): string => programCall(act.datum?.bind(act), ports.state(), tool.id) ?? beside(act);
      const next: ToolAct["next"] = answers => walk.next(answers);
      /** What changes a datum is taken from the row of that datum, not from among the actions. */
      const scope = act.changes === undefined ? "all" : "row";
      return [name, { ...walk, scope, off, listed, datum, next, run: answers => walk.run(answers, tool.id) }];
    });
  const onThing = entries
    .filter(({ act }) => act.on === "thing")
    .map(({ name, act, walk }): [string, ThingAct] => {
      /** Off while the tool's state says why. On the list of a thing of the tool, never of a view that only
       * groups them; and not while it is off, for who prefers not to see what cannot be done. */
      const off = (target: string): string | undefined =>
        actionOff(act, ports.state(), tool.id, target, ports.now(), () => walk.next([], target), undefined, name);
      const unseen = (target: string): boolean =>
        off(target) !== undefined && hides(ports.state().house, ports.me, "off");
      const listed = (target: string): boolean =>
        programCall(tool.targets.bind(tool), ports.state()).includes(target) && !unseen(target);
      const datum = (target: string): string => programCall(act.datum?.bind(act), ports.state(), target) ?? beside(act);
      const scope = act.under === undefined && act.changes === undefined ? "each" : "row";
      return [name, { ...walk, scope, leaves: act.leaves ?? false, listed, off, datum }];
    });
  const actsOn = Object.fromEntries(onThing);
  const acts: ScreenActs = { acts: Object.fromEntries(onTool), actsOn, menusOn: menusOf(tool, actsOn) };
  return { acts, start: starter(tool.id, entries), offers: offersOf(ports, tool.id, entries) };
}
