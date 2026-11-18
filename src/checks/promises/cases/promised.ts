// Every check a program's promises derive: nobody writes them. Each case is a check; so is each law of every act.
import { stateResult } from "../../../journal/readonly-state.ts";
import type { Shown } from "../../../surface/bridge/ports/house-ports.ts";
import { addresses } from "../../../texts/addressing.ts";
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { identityView } from "../../../house/members.ts";
import { promiseTexts as said } from "../../../texts/promises.texts.ts";
import type { Case, Composition, Need } from "../../../tools/promises.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import { startState, toolsStep } from "../../../house/state.ts";
import { coverage, lawChecks } from "./promised-laws.ts";
import { bareIn } from "./promised-shapes.ts";
import {
  cast,
  given,
  label,
  perform,
  runner,
  staged,
  wroteSince,
  type Aim,
  type Check,
  type Decided,
  type House,
} from "../promised-stage.ts";

/** What an act says it did, by parts: one word for what was done, then what it was done to, then what matters. What
 * it says in several lines says it on the first; the rest is what it shows, read as it was written. */
export const composed = /^\p{Lu}\p{Ll}+ · \S[^\n]*(\n|$)/u;
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
  house.journal.replay(
    startState<X>(program.slices, runner, program.identities, program.registry, program.kitMigration),
    (state, event) => toolsStep<X>(state, event, program.slices),
  ).tools;
/** What the tool reads on a target, as whoever acted reads it: each line of its view, parsed when it is JSON. */
function readOn<X extends Program>(house: House<X>, aim: Aim<X>, kase: Case<X>, on = kase.on ?? aim.tool.id) {
  const state = identityView(house.tools.state(), kase.by ?? cast.admin);
  const lines = aim.tool.view(state, on, { recentLines: 100, now: house.now() }).split("\n").filter(Boolean);
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
function assertSummaries<X extends Program>(program: Composition<X>, state: ReturnType<House<X>["tools"]["state"]>) {
  const bare = program.registry.filter(tool => /^\d+$/u.test(tool.summary(state)));
  deepStrictEqual(
    bare.map(tool => said.bareCount(tool.id)),
    [],
  );
}
function caseCheck<X extends Program>(program: Composition<X>, aim: Aim<X>, kase: Case<X>): Check {
  const run = (): Promise<void> =>
    staged(program, async ({ house, reopen }) => {
      await given(house(), aim.tool.id, kase.given, kase.at);
      const before = house().tools.state();
      const done = await perform(house(), aim.tool.id, { ...kase, act: aim.name });
      ok(!done.defect, done.reason);
      if ("refused" in kase.then) {
        deepStrictEqual([done.status, done.reason], ["rejected", kase.then.refused], said.refusalMismatch);
        deepStrictEqual(wroteSince(house(), before.through), []);
        deepStrictEqual(stateResult(house().tools.state().tools), stateResult(before.tools));
      } else {
        strictEqual(done.status, "accepted", done.reason);
        deepStrictEqual(wroteSince(house(), before.through), kase.then.facts, said.factsMismatch);
        strictEqual(saidBy(done)?.text, kase.then.says, said.saysMismatch);
        ok(composed.test(kase.then.says), said.notComposed(kase.then.says));
        ok(!addresses(kase.then.says), said.speaks(kase.then.says));
        const reads = kase.then.reads;
        if (reads) deepStrictEqual(readOn(house(), aim, kase, reads.on), reads.lines, said.readsMismatch);
        /** What was written in a shape is read in it, on the thing the act left and on its tool's list. */
        const read = [saidBy(done)?.target, aim.tool.id].map(on => JSON.stringify(readOn(house(), aim, kase, on)));
        for (const digits of bareIn(aim.act.input, kase.input)) ok(!read.join().includes(digits), said.bare(digits));
        if (kase.then.calls) deepStrictEqual(calledSince(house(), before.through), kase.then.calls);
        for (const [tool, needs] of promisedNeeds(aim, kase.then))
          deepStrictEqual(
            program.registry.find(known => known.id === tool)?.needs?.(house().tools.state(), house().now()) ?? [],
            needs,
            said.needsMismatch,
          );
      }
      /** What a tool says beside its name is never a bare number: a count says what it counts. */
      assertSummaries(program, house().tools.state());
      const after = stateResult(house().tools.state().tools);
      deepStrictEqual(rebuilt(program, house()), after, said.rebuiltMismatch);
      reopen();
      deepStrictEqual(stateResult(house().tools.state().tools), after);
    });
  return { name: label(aim, kase.promise), run };
}
export function promisedChecks<X extends Program>(program: Composition<X>, shown: Shown<X>): readonly Check[] {
  return program.registry.flatMap(tool =>
    Object.entries(tool.acts).flatMap(([name, act]) => {
      const aim = { tool, name, act };
      const accepted = act.cases.find(kase => !("refused" in kase.then));
      return [
        coverage(program, aim, shown),
        ...act.cases.map(kase => caseCheck(program, aim, kase)),
        ...(accepted ? lawChecks(program, aim, accepted) : []),
      ];
    }),
  );
}
