// Any tool contract becomes a surface, in its product's words; acts still cross the house's one execution boundary.
import { TypeGuard, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { allowed } from "../../house/house.ts";
import type { Emission } from "../../journal/events.ts";
import { genericTexts as generic } from "../../texts/generic-surface.texts.ts";
import { surfaceTexts as said } from "../../texts/surface.texts.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import type { Product, Tool as HouseTool } from "../../tools/tool-contract.ts";
import type { Field, Result, ThingAct, Tool, ToolAct, ViewRow } from "../contract.ts";
import { must } from "../window.ts";
import { section, settle, type SurfacePorts, type ToolWords } from "./house-ports.ts";
import { briefOf, field, list, listedIn, rowsIn } from "./rows.ts";
/** Many chosen titles arrive joined by « · »; a list of words is decoded from them. */
const decode = (schema: TSchema, text: string): unknown => {
  if (schema.type === "array" && !text.startsWith("[")) return text ? text.split(" · ") : [];
  if (schema.type === "string" || Value.Check(schema, text)) return text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};
const fieldsOf = (schema: TSchema): [string, TSchema][] =>
  TypeGuard.IsObject(schema) ? Object.entries(schema.properties) : [["input", schema]];
const choices = (schema: TSchema): unknown[] =>
  schema.type === "boolean"
    ? [true, false]
    : list(schema.anyOf).flatMap(arm => {
        const value = field(arm, "const");
        return value === undefined ? [] : [value];
      });
const secret = (schema: unknown): boolean =>
  schema !== null &&
  typeof schema === "object" &&
  (field(schema, "secret") === true || Object.values(schema).some(secret));
/** What the tool wrote about the act it just ran, when it wrote something. */
const wroteBy = (effects: readonly Emission[]): string | undefined => {
  for (const effect of effects) if (effect.layer === "house" && effect.kind === "tool-entry") return effect.data.text;
  return undefined;
};
/** Acts on one existing thing take it from where you stand: nobody types an id. */
const onTarget = "id";
/** A word the product did not give is a defect of the product: it is named, never replaced by a code. */
const worded = (words: Readonly<Record<string, string>>, tool: string, kind: string, name: string): string => {
  const word = words[name];
  if (word === undefined) throw new Error(`${tool} has no words for ${kind} ${name}`);
  return word;
};
const question = (ask: string, schema: TSchema, optional: boolean): Field => {
  const valid = (text: string) => (optional && text === "") || Value.Check(schema, decode(schema, text));
  if (secret(schema)) return { ask, valid, kind: "secret" };
  const options = choices(schema).map(value => ({ title: String(value) }));
  return options.length && !optional ? { ask, valid, kind: "one", options } : { ask, valid, kind: "text" };
};
type Aim = Readonly<{ tool: string; name: string; schema: TSchema; words: ToolWords }>;
const moves = <X extends Product>(ports: SurfacePorts<X>, { tool, name, schema, words }: Aim) => {
  const fields = fieldsOf(schema).filter(([key]) => key !== onTarget);
  const label = worded(words.acts, tool, "act", name);
  const asks = fields.map(([key]) => worded(words.fields, tool, "field", key));
  const optional = (key: string) => schema.type === "object" && !list(schema.required).includes(key);
  return {
    label,
    verb: label.toLowerCase(),
    next: (answers: readonly string[]): Field | null => {
      const next = fields[answers.length];
      const sure: Field = { ask: generic.sure(label), kind: "confirm", options: [{ title: label }] };
      if (!fields.length) return answers.length ? null : sure;
      const ask = `${asks[answers.length] ?? ""}${next && optional(next[0]) ? generic.optional : ""}`;
      return next ? question(ask, next[1], optional(next[0])) : null;
    },
    run: async (answers: readonly string[], target: string, id?: string): Promise<Result> => {
      const given = fields.flatMap(([key, schema], index): [string, unknown][] => {
        const text = answers[index] ?? "";
        return optional(key) && text === "" ? [] : [[key, decode(schema, text)]];
      });
      const input = Object.fromEntries(id === undefined ? given : [...given, [onTarget, id]]);
      const attended = await settle(ports.act({ act: "attend", input: { target } }));
      if (attended.status !== "accepted") return { ok: false, reason: attended.reason ?? toolTexts.unassigned };
      const sent = { act: name, target, input: schema.type === "object" ? input : input.input };
      const done = await settle(ports.act(sent));
      if (done.status !== "accepted") return { ok: false, reason: done.reason ?? toolTexts.unavailable };
      const text = words.done[name] ?? wroteBy(done.effects) ?? said.ok;
      return { ok: true, text: done.private ? `${text} · ${ports.receipt?.(done.private) ?? done.private}` : text };
    },
  };
};
export function anyToolScreen<X extends Product>(ports: SurfacePorts<X>, tool: HouseTool<X>, words: ToolWords): Tool {
  const label = (key: string) => worded(words.fields, tool.id, "field", key);
  const entries = Object.entries(tool.acts).map(([name, act]) => ({ name, schema: act.input }));
  const aimed = (act: (typeof entries)[number]) => fieldsOf(act.schema).some(([key]) => key === onTarget);
  const available = () => allowed(ports.state().house, ports.me, tool.id);
  const act = (name: string, schema: TSchema) => moves(ports, { tool: tool.id, name, schema, words });
  const onTool = ({ name, schema }: (typeof entries)[number]): [string, ToolAct] => {
    const move = act(name, schema);
    return [name, { ...move, scope: "all", available, run: answers => move.run(answers, tool.id) }];
  };
  const onThing = ({ name, schema }: (typeof entries)[number]): [string, ThingAct] => {
    const move = act(name, schema);
    const leaves = name === "remove";
    const next: ThingAct["next"] = answers => move.next(answers);
    return [name, { ...move, scope: "each", leaves, available, next, run: (a, target) => move.run(a, target, target) }];
  };
  return {
    id: tool.id,
    name: words.name,
    place: { key: words.key, section: words.system ? "system" : "tools" },
    summary: () => briefOf(tool.summary(ports.state())),
    /** A thing is called what its row on the list calls it. */
    titleOf: target =>
      must(rowsIn(tool.view(ports.state(), tool.id, ports.limits), label).find(row => row.opens === target)).title,
    view: target => {
      const targets = tool.targets(ports.state());
      if (target !== undefined && !targets.includes(target)) throw new Error(`${tool.id} has no ${target}`);
      const shown = rowsIn(tool.view(ports.state(), target ?? tool.id, ports.limits), label);
      const inside = ({ opens, ...row }: ViewRow): ViewRow =>
        opens && opens !== target && targets.includes(opens) ? { ...row, opens } : row;
      if (target) return [section(words.shown, shown.map(inside), words.empty)];
      return [section(words.listed, listedIn(targets, shown), words.empty)];
    },
    acts: Object.fromEntries(entries.filter(entry => !aimed(entry)).map(onTool)),
    actsOn: Object.fromEntries(entries.filter(aimed).map(onThing)),
  };
}
