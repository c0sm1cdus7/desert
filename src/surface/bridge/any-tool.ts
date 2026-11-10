// A program's tool on a surface: what it reads comes from its view, and each act is asked from its declaration.
import { allowed, hides } from "../../house/house.ts";
import type { Emission } from "../../journal/events.ts";
import { genericTexts as generic } from "../../texts/generic-surface.texts.ts";
import { surfaceTexts as said } from "../../texts/surface.texts.ts";
import type { ProgramAct, ProgramTool } from "../../tools/promises.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { Field, Result, ThingAct, Tool, ToolAct, ViewRow } from "../contract.ts";
import { formats, type Locale } from "../masks.ts";
import { must } from "../window.ts";
import { asking } from "./asking.ts";
import { attendAndAct, section, type SurfacePorts, type ToolWords } from "./house-ports.ts";
import { briefOf, listedIn, rowsIn } from "./rows.ts";

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
    if (summary !== undefined) return { ask: summary, kind: "confirm", reversible: true, options: verb };
    return taken === 0 ? { ask: generic.sure(act.label), kind: "confirm", options: verb } : null;
  };
  return {
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
}
/** Every act of a tool as the surface offers it: on the tool itself, or on one of its things. */
export function programActs<X extends Program>(ports: SurfacePorts<X>, tool: ProgramTool<X>, locale: Locale) {
  /** Why this identity cannot act on the tool at all, when that is so. */
  const foreign = (): string | undefined =>
    allowed(ports.state().house, ports.me, tool.id) ? undefined : generic.notHeld;
  const entries = Object.entries(tool.acts).map(([name, act]) => ({
    name,
    act,
    walk: walked(ports, name, act, locale),
  }));
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
      return [name, { ...walk, scope: "each", leaves: act.leaves ?? false, listed, off, next }];
    });
  return { acts: Object.fromEntries(onTool), actsOn: Object.fromEntries(onThing) };
}
/** A label the program did not give is a defect of the program: it is named, never replaced by a code. */
const worded = (words: Readonly<Record<string, string>>, tool: string, name: string): string => {
  const word = words[name];
  if (word === undefined) throw new Error(`${tool} has no words for ${name}`);
  return word;
};
export function anyToolScreen<X extends Program>(
  ports: SurfacePorts<X>,
  tool: ProgramTool<X>,
  words: ToolWords,
  acts: Pick<Tool, "acts" | "actsOn">,
): Tool {
  const label = (key: string): string => worded(words.reads, tool.id, key);
  const view = (target: string): ViewRow[] => rowsIn(tool.view(ports.state(), target, ports.limits), label);
  return {
    ...acts,
    id: tool.id,
    name: words.name,
    place: { key: words.key, section: words.system ? "system" : "tools" },
    summary: () => briefOf(tool.summary(ports.state())),
    /** A thing is called what its row on the list calls it. */
    titleOf: target => must(view(tool.id).find(row => row.opens === target)).title,
    view: target => {
      const targets = tool.targets(ports.state());
      if (target !== undefined && !targets.includes(target)) throw new Error(`${tool.id} has no ${target}`);
      const inside = ({ opens, ...row }: ViewRow): ViewRow =>
        opens && opens !== target && targets.includes(opens) ? { ...row, opens } : row;
      if (target) return [section(words.shown, view(target).map(inside), words.empty)];
      return [section(words.listed, listedIn(targets, view(tool.id)), words.empty)];
    },
  };
}
