// The acts of a program's tool as a surface offers them: each asked from its declaration, where it stands.
import { allowed, hides } from "../../house/house.ts";
import type { Emission } from "../../journal/events.ts";
import { genericTexts as generic } from "../../texts/generic-surface.texts.ts";
import { surfaceTexts as said } from "../../texts/surface.texts.ts";
import type { ProgramAct, ProgramTool } from "../../tools/promises.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { Field } from "../contract.ts";
import type { Result, ThingAct, ThingMenu, ToolAct } from "../shown-tool.ts";
import { formats, type Locale } from "../masks.ts";
import { maskOf } from "../screen.ts";
import { asking, type Asking } from "./asking.ts";
import { attendAndAct, type ScreenActs, type Start, type SurfacePorts } from "./house-ports.ts";

/** Where a menu of a thing is read: a destination of its tool that is not a thing of it. */
export const menuTarget = (target: string, menu: string): string => `${target}#${menu}`;
/** What the tool wrote about the act it just ran, when it wrote something. */
const wroteBy = (effects: readonly Emission[]): string | undefined => {
  for (const effect of effects) if (effect.layer === "house" && effect.kind === "tool-entry") return effect.data.text;
  return undefined;
};
/** One act as a person walks it: its questions from what it takes, a confirmation when it asks for one, its result. */
function walked<X extends Program>(ports: SurfacePorts<X>, name: string, act: ProgramAct<X>, locale: Locale) {
  const ask = asking(act.input, { formats: formats(locale), optionalMark: generic.optional });
  const verb = [{ title: act.label, key: act.key }];
  const sure = (answers: readonly string[]): Field | null => {
    const taken = ask.taken(answers);
    if (answers.length > taken) return null;
    const summary = act.confirms?.(ask.input(answers));
    /** What takes its thing away is confirmed with going back first; anything else, with going on first. */
    if (summary !== undefined)
      return { ask: summary, kind: "confirm", ...(act.leaves ? {} : { reversible: true }), options: verb };
    return taken === 0 ? { ask: generic.sure(act.label), kind: "confirm", options: verb } : null;
  };
  const walk = {
    label: act.label,
    verb: act.label.toLowerCase(),
    key: act.key,
    hint: act.purpose,
    next: (answers: readonly string[]): Field | null => ask.next(answers) ?? sure(answers),
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
    const found = entries.find(entry => entry.name === name && entry.act.on === "thing");
    if (!found) throw new Error(`${tool} has no act ${name} on a thing`);
    const { act, ask } = found;
    const row = { key: how.key ?? act.key, title: how.title ?? act.label, act: name, on: { tool, target } };
    if (how.today === undefined) return { ...row, detail: how.detail ?? act.purpose };
    const answers = ask.answers(how.today);
    const [from, until] = how.asks ?? [0];
    if (from >= (until ?? answers.length) && !act.confirms)
      throw new Error(`A row starts ${name} of ${tool} asking nothing, and the act does not ask to be confirmed`);
    const detail = how.detail ?? shownOf(ask, answers, from, until ?? answers.length);
    return { ...row, detail, with: { answers, from, ...(until === undefined ? {} : { until }) } };
  };
/** Each menu of the tool among a thing's actions: off while nothing under it can be done, saying why. */
function menusOf<X extends Program>(tool: ProgramTool<X>, shown: Readonly<Record<string, ThingAct>>) {
  const entries = Object.entries(tool.menus ?? {}).map(([id, menu]): [string, ThingMenu] => {
    const under = Object.entries(tool.acts).flatMap(([name, act]) => (act.under === id ? [shown[name]] : []));
    const whys = (target: string) => under.map(act => act?.off?.(target));
    const entry: ThingMenu = {
      label: menu.label,
      key: menu.key,
      hint: menu.purpose,
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
/** Every act of a tool as the surface offers it: on the tool itself, on one of its things, or under a menu. */
export function programActs<X extends Program>(ports: SurfacePorts<X>, tool: ProgramTool<X>, locale: Locale) {
  /** Why this identity cannot act on the tool at all, when that is so. */
  const foreign = (): string | undefined =>
    allowed(ports.state().house, ports.me, tool.id) ? undefined : generic.notHeld;
  const entries = Object.entries(tool.acts).map(([name, act]) => walked(ports, name, act, locale));
  const onTool = entries
    .filter(({ act }) => act.on === "tool")
    .map(({ name, walk }): [string, ToolAct] => {
      return [name, { ...walk, scope: "all", off: foreign, run: answers => walk.run(answers, tool.id) }];
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
      const next: ThingAct["next"] = answers => walk.next(answers);
      const scope = act.under === undefined ? "each" : "row";
      return [name, { ...walk, scope, leaves: act.leaves ?? false, listed, off, next }];
    });
  const actsOn = Object.fromEntries(onThing);
  const acts: ScreenActs = { acts: Object.fromEntries(onTool), actsOn, menusOn: menusOf(tool, actsOn) };
  return { acts, start: starter(tool.id, entries) };
}
