import { alsoCauses } from "./coverage/also-causes.ts";
// The laws every act of every program keeps: nobody promises them case by case, and every act is checked on them.
import { deepStrictEqual, ok } from "node:assert/strict";
import { promiseTexts as said } from "../texts/promises.texts.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { ofTheBase, type Case, type Composition } from "../tools/promises.ts";
import { outsideOf } from "../tools/schema-breaks.ts";
import type { Program } from "../tools/tool-contract.ts";
import { cast, given, label, perform, staged, wroteSince, type Aim, type Check, type Doing } from "./promised-stage.ts";

/** An act stands on its tool or on one of its things: done anywhere else, the house refuses it and writes nothing. */
function placeCheck<X extends Program>(program: Composition<X>, aim: Aim<X>, kase: Case<X>): Check {
  const run = (): Promise<void> =>
    staged(program, async ({ house }) => {
      await given(house(), aim.tool.id, kase.given, kase.at);
      const doing = { ...kase, act: aim.name };
      /** An act on the tool is tried on a thing its own case leaves; when it leaves none, there is no elsewhere. */
      if (aim.act.on === "tool") await perform(house(), aim.tool.id, doing);
      const things = aim.tool.targets(house().tools.state());
      const elsewhere = aim.act.on === "tool" ? things[0] : aim.tool.id;
      if (elsewhere === undefined) return;
      const before = house().tools.state().through;
      const done = await perform(house(), aim.tool.id, { ...doing, on: elsewhere });
      deepStrictEqual([done.status, done.reason], ["rejected", toolTexts.unknown]);
      deepStrictEqual(wroteSince(house(), before), []);
    });
  return { name: label(aim, said.misplaced), run };
}
/** An act that says what the thing is today refuses to leave it as it is: it would write nothing new. */
function unchangedCheck<X extends Program>(program: Composition<X>, aim: Aim<X>, kase: Case<X>): Check[] {
  const { today } = aim.act;
  if (!today) return [];
  const run = (): Promise<void> =>
    staged(program, async ({ house }) => {
      await given(house(), aim.tool.id, kase.given, kase.at);
      const input = today(house().tools.state(), kase.on ?? aim.tool.id, house().now());
      if (input === undefined) return;
      const before = house().tools.state().through;
      const done = await perform(house(), aim.tool.id, { ...kase, act: aim.name, input });
      deepStrictEqual([done.status, done.reason], ["rejected", toolTexts.unchanged]);
      deepStrictEqual(wroteSince(house(), before), []);
    });
  return [{ name: label(aim, said.unchanged), run }];
}
/** The laws of every act, checked from a case of its own that the house accepts. */
export function lawChecks<X extends Program>(program: Composition<X>, aim: Aim<X>, kase: Case<X>): Check[] {
  const refusal = (promise: string, doing: Partial<Doing>, cause: string, input = kase.input): Check => ({
    name: label(aim, promise),
    run: () =>
      staged(program, async ({ house }) => {
        await given(house(), aim.tool.id, kase.given, kase.at);
        const before = house().tools.state().through;
        const done = await perform(house(), aim.tool.id, { ...kase, act: aim.name, input, ...doing });
        deepStrictEqual([done.status, done.reason], ["rejected", cause]);
        deepStrictEqual(wroteSince(house(), before), []);
      }),
  });
  return [
    ...outsideOf(aim.act.input, kase.input).map((input, index) =>
      refusal(said.outside(index + 1), {}, toolTexts.invalid, input),
    ),
    refusal(said.notHeld, { by: cast.outsider }, toolTexts.outsideKit),
    refusal(said.unseen, { by: cast.member, attends: false }, toolTexts.unattended),
    placeCheck(program, aim, kase),
    ...unchangedCheck(program, aim, kase),
  ];
}
/** What an act declares has to add up: a case the house accepts, and a case for each cause it may refuse with. */
export function coverage<X extends Program>(program: Composition<X>, aim: Aim<X>): Check {
  const refused = aim.act.cases.flatMap(kase => ("refused" in kase.then ? [kase.then.refused] : []));
  const run = (): Promise<void> =>
    Promise.resolve().then(async () => {
      const does = aim.act.cases.some(kase => !("refused" in kase.then));
      ok(does, said.nothingDone);
      /** What an act puts to be confirmed is promised word for word by one of its cases. */
      const sure = aim.act.cases.some(kase => !("refused" in kase.then) && kase.then.sure !== undefined);
      ok(!aim.act.confirms || sure, said.unsure);
      /** What the base itself refuses with is not the act's to declare; a case may still promise it. */
      const own = (causes: readonly string[]) => [...new Set(causes.filter(cause => !ofTheBase(cause)))].sort();
      deepStrictEqual(
        own(
          [...refused, ...(await alsoCauses(program, aim))].map(
            cause => aim.act.outside.find(out => cause.startsWith(`${out} · `)) ?? cause,
          ),
        ),
        own([...aim.act.refuses, ...aim.act.outside]),
        said.causesMismatch,
      );
    });
  return { name: label(aim, said.covered), run };
}
