// Multiple marks are one answer: derive every combination, never pretend one option is the whole set.
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { asking } from "../../surface/bridge/asking.ts";
import { fieldOf, type Walk } from "../../surface/screen.ts";
import { walkBody, walkHints } from "../../surface/walk.ts";
import { walking } from "../../surface/walking.ts";
import { answerChange } from "../../tools/answers/answer-change.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { Seat } from "../promised-keys.ts";
import type { Aim } from "../promised-stage.ts";

export function manyChoices<X extends Program>(seat: Seat<X>, aim: Aim<X>, walk: Walk, target: string) {
  const field = fieldOf(seat.tools, walk);
  if (field?.kind !== "many") return;
  const sets = field.options.reduce<readonly string[][]>(
    (sets, option) => [...sets, ...sets.map(set => [...set, option.title])],
    [[]],
  );
  const ask = asking(aim.act.input, seat.words);
  for (const marks of sets) {
    const answer = marks.join(" · ");
    const why = aim.act.stops?.(ask.sofar([...walk.answers, answer]), seat.state(), target, seat.now());
    if (why === undefined) continue;
    const marked = { ...walk, marks };
    const current = fieldOf(seat.tools, marked);
    const change = answerChange(why);
    strictEqual(current?.wrong?.(answer), change.reason);
    ok(!walkHints(marked, current, seat.tools).some(hint => hint.intent === "confirm"));
    const result = walking([marked], marked, seat.tools, { kind: "confirm" }, seat.now());
    strictEqual(result.run, undefined);
    if (change.unchanged) {
      deepStrictEqual(result.session, [marked]);
      ok(!JSON.stringify(walkBody(marked, current, 0)).includes(toolTexts.unchanged));
    }
  }
}
