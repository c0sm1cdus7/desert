// Every check a program's promises derive: nobody writes them. Each case is a check; so is each law of every act.
import { addresses } from "../catalogs/addressing.ts";
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { identityView } from "../house/house.ts";
import { promiseTexts as said } from "../texts/promises.texts.ts";
import type { Case, Composition, Need } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import { startState, toolsStep } from "../tools/tools.ts";
import { coverage, lawChecks } from "./promised-laws.ts";
import { bareIn } from "./promised-shapes.ts";
import { cast, given, label, perform, runner, staged, wroteSince } from "./promised-stage.ts";
import type { Aim, Check, Decided, House } from "./promised-stage.ts";

/** What an act says it did, by parts: one word for what was done, then what it was done to, then what matters. */
export const composed = /^\p{Lu}\p{Ll}+ · \S.*$/u;
/** Whom the house called for attention since a point of the journal, each identity once, in order. */
const calledSince = <X extends Program>(house: House<X>, seq: number): string[] => [
  ...new Set(
    house.journal.replay<string[]>(
      [],
      (called, event) => (event.layer === "house" && event.kind === "stimulus" ? [...called, event.by] : called),
      seq,
    ),
  ),
];
/** What the tool wrote about the act, when it wrote something: what it says, and for whom alone if for one. */
const saidBy = <X extends Program>(decided: Decided<X>) => {
  for (const effect of decided.effects)
    if (effect.layer === "house" && effect.kind === "tool-entry") return effect.data;
  return undefined;
};
/** What every tool keeps, folded again from the first fact: the journal alone has to be enough. */
const rebuilt = <X extends Program>(program: Composition<X>, house: House<X>): X["tools"] =>
  house.journal.replay(startState<X>(program.slices, runner), (state, event) =>
    toolsStep<X>(state, event, program.slices),
  ).tools;
/** What the tool reads on a target, as whoever acted reads it: each line of its view, parsed when it is JSON. */
function readOn<X extends Program>(house: House<X>, aim: Aim<X>, kase: Case<X>, on = kase.on ?? aim.tool.id) {
  const state = identityView(house.tools.state(), kase.by ?? cast.admin);
  const lines = aim.tool.view(state, on, { recentLines: 100 }).split("\n").filter(Boolean);
  return lines.map((line): unknown => {
    try {
      return JSON.parse(line);
    } catch {
      return line;
    }
  });
}
/** What a case promises needs someone to act afterwards, tool by tool: its own tool's, and any other it names. */
export const promisedNeeds = <X extends Program>(aim: Aim<X>, then: Case<X>["then"]): [string, readonly Need[]][] => {
  if ("refused" in then) return [];
  return [...(then.needs ? [[aim.tool.id, then.needs] as const] : []), ...Object.entries(then.needsIn ?? {})].map(
    ([tool, needs]) => [tool, needs],
  );
};
/** A case, checked on a real house: what it says and writes, or its refusal; and the same house after reopening. */
function caseCheck<X extends Program>(program: Composition<X>, aim: Aim<X>, kase: Case<X>): Check {
  const run = (): Promise<void> =>
    staged(program, async ({ house, reopen }) => {
      await given(house(), aim.tool.id, kase.given);
      const before = house().tools.state();
      const done = await perform(house(), aim.tool.id, { ...kase, act: aim.name });
      const wrote = wroteSince(house(), before.through);
      if ("refused" in kase.then) {
        deepStrictEqual([done.status, done.reason], ["rejected", kase.then.refused]);
        deepStrictEqual(wrote, []);
        deepStrictEqual(house().tools.state().tools, before.tools);
      } else {
        strictEqual(done.status, "accepted", done.reason);
        deepStrictEqual(wrote, kase.then.facts);
        strictEqual(saidBy(done)?.text, kase.then.says);
        ok(composed.test(kase.then.says), said.notComposed(kase.then.says));
        ok(!addresses(kase.then.says), said.speaks(kase.then.says));
        strictEqual(saidBy(done)?.recipient !== undefined, kase.then.privately === true, said.forWhom);
        if (kase.then.reads) deepStrictEqual(readOn(house(), aim, kase, kase.then.reads.on), kase.then.reads.lines);
        /** What was written in a shape is read in it, on the thing the act left and on its tool's list. */
        const read = [saidBy(done)?.target, aim.tool.id].map(on => JSON.stringify(readOn(house(), aim, kase, on)));
        for (const digits of bareIn(aim.act.input, kase.input)) ok(!read.join().includes(digits), said.bare(digits));
        if (kase.then.calls) deepStrictEqual(calledSince(house(), before.through), kase.then.calls);
        for (const [tool, needs] of promisedNeeds(aim, kase.then))
          deepStrictEqual(
            program.registry.find(known => known.id === tool)?.needs?.(house().tools.state(), house().now()) ?? [],
            needs,
          );
      }
      const after = house().tools.state().tools;
      deepStrictEqual(rebuilt(program, house()), after);
      reopen();
      deepStrictEqual(house().tools.state().tools, after);
    });
  return { name: label(aim, kase.promise), run };
}
export function promisedChecks<X extends Program>(program: Composition<X>): readonly Check[] {
  return program.registry.flatMap(tool =>
    Object.entries(tool.acts).flatMap(([name, act]) => {
      const aim = { tool, name, act };
      const accepted = act.cases.find(kase => !("refused" in kase.then));
      return [
        coverage(aim),
        ...act.cases.map(kase => caseCheck(program, aim, kase)),
        ...(accepted ? lawChecks(program, aim, accepted) : []),
      ];
    }),
  );
}
