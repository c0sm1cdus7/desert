// Adapts action callbacks and cases while guarding the owning group and folder versus object distinction.
import { OutsideDefect } from "../../fields/program-call.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import type { Case, Did, ProgramAct, Step } from "../promises-contract.ts";
import type { ActContext, Program, State } from "../tool-contract.ts";
import { adaptReject, mapResult } from "./action-results.ts";
import { folderOf, localTarget, objectOf } from "./destinations.ts";
import type { ProgramGroup } from "./program.ts";
import { localState } from "./runtime.ts";
/** What a program calls by its tool's own name is the tool's folder; anything else it names is one of its things. */
export const targetOf = (id: string, group: string, target?: string) =>
  target === undefined || target === group ? folderOf(id, group) : objectOf(id, group, target);
/** A step is an act of the case's own tool unless it names another tool of the same program: never of another. */
function didOf(id: string, group: string, { tool = group, ...did }: Did): Did {
  return { ...did, act: `${tool}/${did.act}`, on: targetOf(id, tool, did.on) };
}
function casesOf<X extends Program>(id: string, group: string, cases: readonly Case<X>[]): readonly Case<Program>[] {
  const step = (each: Step): Step =>
    "days" in each ||
    "doorKey" in each ||
    "mindCards" in each ||
    "invitation" in each ||
    "device" in each ||
    "scene" in each
      ? each
      : didOf(id, group, each);
  return cases.map(each => ({
    ...each,
    on: targetOf(id, group, each.on),
    ...(each.given ? { given: each.given.map(step) } : {}),
    then:
      "reads" in each.then
        ? { ...each.then, reads: { ...each.then.reads, on: targetOf(id, group, each.then.reads.on ?? each.on) } }
        : each.then,
  }));
}
export function adaptAction<X extends Program>(
  id: string,
  group: string,
  owner: ProgramGroup<X>,
  act: ProgramAct<X>,
): ProgramAct<Program> {
  const stateOf = (state: State<Program>) => localState<X>(state, id);
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
  return {
    ...plain,
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
