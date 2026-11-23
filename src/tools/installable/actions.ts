// Adapts action callbacks and cases while guarding the owning group and folder versus object distinction.
import type { Text } from "../../fields/phrases.ts";
import { OutsideDefect } from "../../fields/program-call.ts";
import { isAsker, type Asked } from "../../fields/fields.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import type { Case, Did, Outcome, ProgramAct, Step } from "../promises-contract.ts";
type Done = Exclude<Outcome<Program>, Readonly<{ refused: Text }>>;
import type { ActContext, Program, State } from "../tool-contract.ts";
import { adaptReject, mapResult } from "./action-results.ts";
import { folderOf, localTarget, objectOf } from "./destinations.ts";
import type { ProgramGroup } from "./program.ts";
import { ownState, type ProgramReadings } from "./runtime.ts";
/** What a program calls by its tool's own name is the tool's folder; anything else it names is one of its things. */
export const targetOf = (id: string, group: string, target?: string) =>
  target === undefined || target === group ? folderOf(id, group) : objectOf(id, group, target);
/** A step is an act of the case's own tool unless it names another tool of the same program, or a tool of another
 * program of the composition with `program`. */
function didOf(id: string, group: string, { tool = group, program = id, ...did }: Did): Did {
  if (program !== id && tool === group) throw new Error(`A step of ${id} on ${program} names no tool of it`);
  return { ...did, act: `${tool}/${did.act}`, on: targetOf(program, tool, did.on) };
}
/** What a case promises another program writes is told by its program; the house compares kinds and data. */
const toldOf = (id: string, facts: Done["facts"]) =>
  facts.map(fact => {
    if (!("program" in fact)) return fact;
    const { program, ...told } = fact;
    if (!told.kind.startsWith(`${program}/`))
      throw new Error(`A case of ${id} tells ${told.kind} by ${program}, which does not write it`);
    return told;
  });
function casesOf<X extends Program>(id: string, group: string, cases: readonly Case<X>[]): readonly Case<Program>[] {
  const step = (each: Step): Step =>
    "days" in each ||
    "doorKey" in each ||
    "mindCards" in each ||
    "invitation" in each ||
    "device" in each ||
    "kit" in each ||
    "scene" in each
      ? each
      : didOf(id, group, each);
  return cases.map(each => ({
    ...each,
    on: targetOf(id, group, each.on),
    ...(each.given ? { given: each.given.map(step) } : {}),
    then:
      "refused" in each.then
        ? each.then
        : {
            ...each.then,
            facts: toldOf(id, each.then.facts),
            ...(each.then.reads
              ? { reads: { ...each.then.reads, on: targetOf(id, group, each.then.reads.on ?? each.on) } }
              : {}),
          },
  }));
}
export function adaptAction<X extends Program>(
  id: string,
  group: string,
  owner: ProgramGroup<X>,
  act: ProgramAct<X>,
  readings?: ProgramReadings,
): ProgramAct<Program> {
  const stateOf = ownState<X>(id, readings);
  const target = (value: string) => localTarget(id, group, value);
  const accepts = (state: State<Program>, value: string) =>
    act.on === "tool"
      ? value === folderOf(id, group)
      : owner.targets(stateOf(state)).some(object => objectOf(id, group, object) === value);
  const run = (input: unknown, context: ActContext<Program>) => {
    if (!accepts(context.state, context.target)) throw new OutsideDefect(toolTexts.unknown);
    const { execute: _execute, ...core } = context;
    const result = act.run(input, { ...core, state: stateOf(context.state), target: target(context.target) });
    const mapped = (value: Awaited<typeof result>) => mapResult(id, group, value);
    return result instanceof Promise ? result.then(mapped) : mapped(result);
  };
  const plain = plainAction(act);
  const asked = (asks: Asked) => (answered: Answered, at: number, state: State<Program>, on: string) =>
    asks(answered, at, stateOf(state), on === "" || on === id ? group : target(on));
  return {
    ...plain,
    input: localAsks(act.input, asked),
    on: "thing",
    folder: folderOf(id, group),
    refuses: [...act.refuses, toolTexts.unknown],
    run: Object.assign(run, act.run),
    cases: casesOf(id, group, act.cases),
    offered: (state, value, at) =>
      accepts(state, value) ? act.offered?.(stateOf(state), target(value), at) : toolTexts.unknown,
    ...adaptQuestions(id, act, stateOf, target),
    ...adaptReject(id, group, act),
  };
}
function adaptQuestions<X extends Program>(
  id: string,
  act: ProgramAct<X>,
  stateOf: (s: State<Program>) => State<X>,
  target: (s: string) => string,
): Partial<ProgramAct<Program>> {
  return {
    ...(act.choices ? { choices: (source, s, t) => act.choices?.(source, stateOf(s), target(t)) } : {}),
    ...(act.today ? { today: (s, t, at) => act.today?.(stateOf(s), target(t), at) } : {}),
    ...(act.confirms ? { confirms: (i, s, t, at) => act.confirms?.(i, stateOf(s), target(t), at) } : {}),
    ...(act.datum ? { datum: (s, t) => act.datum?.(stateOf(s), target(t)) } : {}),
    ...(act.stops ? { stops: (i, s, t, at) => act.stops?.(i, stateOf(s), target(t), at) } : {}),
    ...(act.among ? { among: (i, s, t, at) => act.among?.(i, stateOf(s), target(t), at) ?? {} } : {}),
    ...(act.also
      ? {
          also: {
            tool: folderOf(id, act.also.tool),
            ...(act.also.name ? { name: act.also.name } : {}),
            with: (s, t, at) => act.also?.with(stateOf(s), localTarget(id, act.also.tool, t), at),
            ...(act.also.off
              ? { off: (s, t, at) => act.also?.off?.(stateOf(s), localTarget(id, act.also.tool, t), at) }
              : {}),
            ...(act.also.datum
              ? { datum: (s, t) => act.also?.datum?.(stateOf(s), localTarget(id, act.also.tool, t)) }
              : {}),
            ...(act.also.opens
              ? { opens: (s, t) => act.also?.opens?.(stateOf(s), localTarget(id, act.also.tool, t)) ?? {} }
              : {}),
          },
        }
      : {}),
  };
}

type Answered = Readonly<Record<string, unknown>>;
/** A question a program asks only as the house says (`when`) reads, as everything else it reads, its own state with
 * its readings and its local target. A declaration without one stays the very same. */
function localAsks<T>(schema: T, asked: (asks: Asked) => Asked<State<Program>>): T;
function localAsks(schema: unknown, asked: (asks: Asked) => Asked<State<Program>>): unknown {
  if (!asksSomewhere(schema)) return schema;
  if (Array.isArray(schema)) return schema.map((each: unknown): unknown => localAsks(each, asked));
  if (schema === null || typeof schema !== "object") return schema;
  const copy: Record<string | symbol, unknown> = {};
  for (const key of Reflect.ownKeys(schema)) {
    const value: unknown = Reflect.get(schema, key);
    copy[key] = key === "when" && isAsker(value) ? asked(value) : localAsks(value, asked);
  }
  return copy;
}
const asksSomewhere = (schema: unknown): boolean =>
  schema !== null &&
  typeof schema === "object" &&
  Reflect.ownKeys(schema).some(key => {
    const value: unknown = Reflect.get(schema, key);
    return key === "when" ? isAsker(value) : asksSomewhere(value);
  });
function plainAction<X extends Program>(act: ProgramAct<X>) {
  const {
    confirms: _confirms,
    today: _today,
    datum: _datum,
    stops: _stops,
    among: _among,
    choices: _choices,
    reject: _reject,
    also: _also,
    ...plain
  } = act;
  return plain;
}
