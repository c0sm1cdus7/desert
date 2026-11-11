// The acts of a program's tool as a surface offers them: each asked from its declaration, where it stands.
import { allowed, hides } from "../../house/house.ts";
import type { Emission } from "../../journal/events.ts";
import { genericTexts as generic } from "../../texts/generic-surface.texts.ts";
import { surfaceTexts as said } from "../../texts/surface.texts.ts";
import { aid, worded } from "../../tools/act-words.ts";
import type { ProgramAct, ProgramTool } from "../../tools/promises.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { Field } from "../contract.ts";
import type { Result, ThingAct, ThingMenu, ToolAct, ViewRow } from "../shown-tool.ts";
import { formats, type Locale } from "../masks.ts";
import { maskOf } from "../screen.ts";
import { asking, type Asking, type AskWords } from "./asking.ts";
import { attendAndAct, type ScreenActs, type Start, type SurfacePorts } from "./house-ports.ts";

/** Where a menu of a thing is read: a destination of its tool that is not a thing of it. */
export const menuTarget = (target: string, menu: string): string => `${target}#${menu}`;
/** What the tool wrote about the act it just ran, when it wrote something. */
const wroteBy = (effects: readonly Emission[]): string | undefined => {
  for (const effect of effects) if (effect.layer === "house" && effect.kind === "tool-entry") return effect.data.text;
  return undefined;
};
/** A name as the bar says it: with a capital. */
export const capital = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
type Asked = Readonly<{ locale: Locale; things: NonNullable<AskWords["things"]> }> &
  /** What a thing of a tool is called, for the act that asks to be confirmed on it. */
  Readonly<{ titled: (tool: string, target: string) => string }>;
type Own<X extends Program> = Readonly<{ tool: string; name: string; act: ProgramAct<X> }>;
/** One act as a person walks it: its questions from what it takes, a confirmation when it asks for one, its result. */
function walked<X extends Program>(ports: SurfacePorts<X>, { tool, name, act }: Own<X>, asked: Asked) {
  const words = { formats: formats(asked.locale), optionalMark: generic.optional };
  const ask = asking(act.input, { ...words, things: asked.things });
  const title = act.title ?? capital(act.name);
  /** Who confirms is the act's own verb, taken by its initial; what can be undone comes with that verb chosen. */
  const confirm = {
    options: [{ title: act.enter, key: act.enter.charAt(0) }],
    ...(act.undoable ? { reversible: true } : {}),
  };
  const sure = (answers: readonly string[], target?: string): Field | null => {
    const taken = ask.taken(answers);
    if (answers.length > taken) return null;
    const summary = act.confirms?.(ask.input(answers), ports.state(), target ?? tool);
    if (summary !== undefined) return { ask: summary, kind: "confirm", ...confirm };
    const thing = target === undefined ? undefined : asked.titled(tool, target);
    return taken === 0 ? { ask: generic.sure(title, thing), kind: "confirm", ...confirm } : null;
  };
  const walk = {
    label: act.name,
    verb: act.enter,
    key: act.key,
    title: (): string => title,
    next: (answers: readonly string[], target?: string): Field | null => ask.next(answers) ?? sure(answers, target),
    run: async (answers: readonly string[], target: string): Promise<Result> => {
      const done = await attendAndAct(ports, target, name, ask.input(answers));
      if (done.status !== "accepted") return { ok: false, reason: done.reason ?? "" };
      const text = wroteBy(done.effects) ?? said.ok;
      return { ok: true, text: done.private ? `${text} · ${ports.receipt?.(done.private) ?? done.private}` : text };
    },
  };
  return { name, act, ask, walk };
}
type Walked<X extends Program> = ReturnType<typeof walked<X>>;
/** What a thing has today as its row shows it: each answer in the shape of its field. */
const shownOf = (ask: Asking, answers: readonly string[], from: number, until: number): string =>
  answers
    .slice(from, until)
    .map((answer, index) => maskOf(ask.next(answers.slice(0, from + index)), answer))
    .filter(Boolean)
    .join(" · ");
/** The row that starts one act of a thing. Given what the thing has today, the act opens on it; and it may ask
 * only one part of it, keeping the rest as it is. */
const starter =
  <X extends Program>(tool: string, entries: readonly Walked<X>[]): Start =>
  (name, target, how = {}) => {
    const found = entries.find(entry => entry.name === name);
    if (!found) throw new Error(`${tool} has no act ${name}`);
    const { act, ask } = found;
    /** An act on the tool itself has no thing to stand on: its row says the tool alone. */
    const on = act.on === "tool" ? { tool } : { tool, target };
    /** A row that names itself is held to what the name of an act is held to: what a row says, in lower case. */
    const title = how.title === undefined ? act.name : worded({ name: how.title }).name;
    const row = { key: how.key ?? act.key, title, act: name, on };
    if (how.today === undefined) return { ...row, ...(how.detail ? { detail: how.detail } : {}) };
    const answers = ask.answers(how.today);
    const [from, until] = how.asks ?? [0];
    if (from >= (until ?? answers.length) && !act.confirms)
      throw new Error(`A row starts ${name} of ${tool} asking nothing, and the act does not ask to be confirmed`);
    const detail = how.detail ?? shownOf(ask, answers, from, until ?? answers.length);
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
    entries.flatMap(({ name, act, ask }): ViewRow[] => {
      const { also } = act;
      const given = also?.tool === other ? also.with(ports.state(), target) : undefined;
      if (!also || given === undefined) return [];
      const row = { key: act.key, title: also.name ?? act.name, act: name, on: { tool } };
      const why = also.off?.(ports.state(), target);
      if (why !== undefined) return [{ ...row, detail: why, off: true }];
      const fixed = ask.leading(given);
      /** What the thing suggests comes after what it fixes: those questions open on it, and are still asked. */
      const answers = ask.leading({ ...given, ...also.opens?.(ports.state(), target) });
      if (ask.next(fixed) === null && !act.confirms)
        throw new Error(`${tool} offers ${name} on ${other} asking nothing, and the act does not ask to be confirmed`);
      /** With no datum of its own here, its row says what the act is for: the list fills that in. */
      const datum = also.datum?.(ports.state(), target);
      return [{ ...row, ...(datum ? { detail: datum } : {}), with: { answers, from: fixed.length } }];
    });
/** What an act says to its right when it has no datum of its own: that it cannot be undone, or what it is for.
 * The right of an act is never empty. */
const beside = (act: Readonly<{ undoable: boolean; purpose: string }>): string =>
  act.undoable ? act.purpose : generic.irreversible;
/** Every act of a tool as the surface offers it: on the tool itself, on one of its things, or under a menu. */
export function programActs<X extends Program>(ports: SurfacePorts<X>, tool: ProgramTool<X>, asked: Asked) {
  /** Why this identity cannot act on the tool at all, when that is so. */
  const foreign = (): string | undefined =>
    allowed(ports.state().house, ports.me, tool.id) ? undefined : generic.notHeld;
  const entries = Object.entries(tool.acts).map(([name, act]) => walked(ports, { tool: tool.id, name, act }, asked));
  const onTool = entries
    .filter(({ act }) => act.on === "tool")
    .map(({ name, act, walk }): [string, ToolAct] => {
      /** Off for who does not hold the tool, and while the tool itself says why it cannot be done. Hidden, then,
       * for who prefers not to see what is not theirs, or what cannot be done. */
      const off = (): string | undefined => foreign() ?? act.offered?.(ports.state(), tool.id);
      const listed = (): boolean =>
        off() === undefined || !hides(ports.state().house, ports.me, foreign() === undefined ? "off" : "foreign");
      const datum = (): string => act.datum?.(ports.state(), tool.id) ?? beside(act);
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
      const off = (target: string): string | undefined => foreign() ?? act.offered?.(ports.state(), target);
      const unseen = (target: string): boolean =>
        off(target) !== undefined && hides(ports.state().house, ports.me, "off");
      const listed = (target: string): boolean => tool.targets(ports.state()).includes(target) && !unseen(target);
      const datum = (target: string): string => act.datum?.(ports.state(), target) ?? beside(act);
      const scope = act.under === undefined && act.changes === undefined ? "each" : "row";
      return [name, { ...walk, scope, leaves: act.leaves ?? false, listed, off, datum }];
    });
  const actsOn = Object.fromEntries(onThing);
  const acts: ScreenActs = { acts: Object.fromEntries(onTool), actsOn, menusOn: menusOf(tool, actsOn) };
  return { acts, start: starter(tool.id, entries), offers: offersOf(ports, tool.id, entries) };
}
