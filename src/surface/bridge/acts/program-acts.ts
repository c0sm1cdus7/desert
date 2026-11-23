// The acts of a program's tool as a surface offers them: each asked from its declaration, where it stands.
import { presentedRuleAction } from "./rule-presentation.ts";
import { walked, type Asked } from "./asked-act.ts";
import { OutsideDefect, programCall } from "../../../fields/program-call.ts";
import { hides } from "../../../house/members.ts";
import type { Text } from "../../../fields/phrases.ts";
import { genericTexts } from "../../../texts/generic-surface.texts.ts";
import { aid, worded } from "../../../tools/act-words.ts";
import type { ProgramTool } from "../../../tools/promises.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import { actionOff } from "./action-off.ts";
import type { ThingAct, ThingMenu, ToolAct, ViewRow } from "../../contract/shown-tool.ts";
import { maskOf } from "../../session/screen.ts";
import type { Asking } from "../questions/asking.ts";
import { say, type ScreenActs, type Start, type SurfacePorts } from "../ports/house-ports.ts";
/** Where a menu of a thing is read: a destination of its tool that is not a thing of it. */
export const menuTarget = (target: string, menu: string): string => `${target}#${menu}`;

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
  <X extends Program>(ports: SurfacePorts<X>, tool: string, entries: readonly Walked<X>[]): Start =>
  (name, target, how = {}) => {
    const found = entries.find(entry => entry.name === name);
    if (!found) throw new OutsideDefect(new Error(`${tool} has no act ${name}`));
    const { act, ask } = found;
    /** An act on the tool itself has no thing to stand on: its row says the tool alone. */
    const on = act.on === "tool" ? { tool } : { tool, target };
    /** A row that names itself is held to what the name of an act is held to: what a row says, in lower case. */
    const title = how.title === undefined ? say(ports, act.name) : programCall(worded, { name: how.title }).name;
    const key = how.key ?? act.key;
    const row = { ...(key ? { key } : {}), title, act: name, on };
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
function menusOf<X extends Program>(
  ports: SurfacePorts<X>,
  tool: ProgramTool<X>,
  shown: Readonly<Record<string, ThingAct>>,
) {
  const entries = Object.entries(tool.menus ?? {}).map(([id, menu]): [string, ThingMenu] => {
    const under = Object.entries(tool.acts).flatMap(([name, act]) => (act.under === id ? [shown[name]] : []));
    const whys = (target: string) => under.map(act => act?.off?.(target));
    const entry: ThingMenu = {
      label: say(ports, menu.name),
      key: menu.key,
      purpose: say(ports, aid(menu.purpose)),
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
      const destination = act.folder ?? tool;
      const on = destination === tool ? { tool } : { tool, target: destination };
      const row = { key: act.key, title: say(ports, also.name ?? act.name), act: name, on };
      const fixed = ask.leading(given);
      const why = actionOff(act, ports.state(), tool, destination, ports.now(), () => walk.next(fixed), target, name);
      /** Off, it says why; and it is not there for who prefers not to see what cannot be done. */
      if (why !== undefined && hides(ports.state().house, ports.me, "off")) return [];
      if (why !== undefined) return [{ ...row, detail: say(ports, why), off: true }];
      /** What the thing suggests comes after what it fixes: those questions open on it, and are still asked. */
      const answers = ask.leading({ ...given, ...programCall(also.opens?.bind(also), ports.state(), target) });
      if (ask.next(fixed) === null && !act.confirms)
        throw new OutsideDefect(
          new Error(`${tool} offers ${name} on ${other} asking nothing, and the act does not ask to be confirmed`),
        );
      /** With no datum of its own here, its row says what the act is for: the list fills that in. */
      const datum = programCall(also.datum?.bind(also), ports.state(), target);
      return [{ ...row, ...(datum ? { detail: say(ports, datum) } : {}), with: { answers, from: fixed.length } }];
    });
/** What an act says to its right when it has no datum of its own: that it cannot be undone, or what it is for.
 * The right of an act is never empty. */
const beside = <X extends Program>(ports: SurfacePorts<X>, act: Readonly<{ undoable: boolean; purpose: Text }>) =>
  say(ports, act.undoable ? act.purpose : genericTexts.irreversible);
function liveRuleAction<X extends Program>(ports: SurfacePorts<X>, tool: string, name: string, walk: ToolAct): ToolAct {
  if (tool !== "rules") return walk;
  return Object.defineProperties(
    walk,
    Object.getOwnPropertyDescriptors(
      presentedRuleAction(
        tool,
        name,
        ports.state,
        { label: walk.label, verb: walk.verb },
        walk.listed ?? (() => true),
        ports.language,
      ),
    ),
  );
}
/** An act on the tool itself. Off for who does not hold the tool, and while the tool itself says why it cannot be
 * done. Hidden, then, for who prefers not to see what is not theirs, or what cannot be done. */
function toolAct<X extends Program>(ports: SurfacePorts<X>, tool: ProgramTool<X>, { name, act, walk }: Walked<X>) {
  const off = (): string | undefined => {
    const why = actionOff(act, ports.state(), tool.id, tool.id, ports.now(), () => walk.next([]), undefined, name);
    return why === undefined ? undefined : say(ports, why);
  };
  const listed = (): boolean => off() === undefined || !hides(ports.state().house, ports.me, "off");
  const datum = (): string => {
    const own = programCall(act.datum?.bind(act), ports.state(), tool.id);
    return own === undefined ? beside(ports, act) : say(ports, own);
  };
  /** What changes a datum is taken from the row of that datum, not from among the actions. */
  const scope = act.changes === undefined ? "all" : "row";
  const shown: ToolAct = {
    ...walk,
    scope,
    off,
    listed,
    datum,
    next: answers => walk.next(answers),
    run: answers => walk.run(answers, tool.id),
  };
  return liveRuleAction(ports, tool.id, name, shown);
}
/** An act on a thing. Off while the tool's state says why. On the list of a thing of the tool, never of a view that
 * only groups them; and not while it is off, for who prefers not to see what cannot be done. */
function thingAct<X extends Program>(ports: SurfacePorts<X>, tool: ProgramTool<X>, { name, act, walk }: Walked<X>) {
  const off = (target: string): string | undefined => {
    const why = actionOff(
      act,
      ports.state(),
      tool.id,
      target,
      ports.now(),
      () => walk.next([], target),
      undefined,
      name,
    );
    return why === undefined ? undefined : say(ports, why);
  };
  const unseen = (target: string): boolean => off(target) !== undefined && hides(ports.state().house, ports.me, "off");
  const listed = (target: string): boolean =>
    programCall(tool.targets.bind(tool), ports.state()).includes(target) && !unseen(target);
  const datum = (target: string): string => {
    const own = programCall(act.datum?.bind(act), ports.state(), target);
    return own === undefined ? beside(ports, act) : say(ports, own);
  };
  const scope = act.under === undefined && act.changes === undefined ? "each" : "row";
  const shown: ThingAct = { ...walk, scope, leaves: act.leaves ?? false, listed, off, datum };
  return shown;
}
/** Every act of a tool as the surface offers it: on the tool itself, on one of its things, or under a menu. */
export function programActs<X extends Program>(ports: SurfacePorts<X>, tool: ProgramTool<X>, asked: Asked) {
  const entries = Object.entries(tool.acts).map(([name, act]) => walked(ports, { tool: tool.id, name, act }, asked));
  const onTool = entries
    .filter(({ act }) => act.on === "tool")
    .map((entry): [string, ToolAct] => [entry.name, toolAct(ports, tool, entry)]);
  const onThing = entries
    .filter(({ act }) => act.on === "thing")
    .map((entry): [string, ThingAct] => [entry.name, thingAct(ports, tool, entry)]);
  const actsOn = Object.fromEntries(onThing);
  const acts: ScreenActs = { acts: Object.fromEntries(onTool), actsOn, menusOn: menusOf(ports, tool, actsOn) };
  return { acts, start: starter(ports, tool.id, entries), offers: offersOf(ports, tool.id, entries) };
}
