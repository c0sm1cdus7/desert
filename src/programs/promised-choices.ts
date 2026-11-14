// Each case supplies answers and state: every declared blocked choice must be visible before it can be taken.
import { closedChoices } from "./choices/closed-choices.ts";
import { manyChoices } from "./choices/many-choices.ts";
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { asking } from "../surface/bridge/asking.ts";
import type { Shown } from "../surface/bridge/house-ports.ts";
import type { Field, Option } from "../surface/contract.ts";
import { begin, fieldOf, opened, optionsOf, type Walk } from "../surface/screen.ts";
import { walkBody } from "../surface/walk.ts";
import { walking } from "../surface/walking.ts";
import { promiseTexts } from "../texts/promises.texts.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { surfaceTexts } from "../texts/surface.texts.ts";
import type { Case, Composition } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import { seated, type Seat } from "./promised-keys.ts";
import { prefer } from "./promised-off.ts";
import { cast, given, label, staged, type Aim, type Check } from "./promised-stage.ts";

type Expected = Readonly<{ value: string; why: string }>;
function blocked<X extends Program>(
  program: Composition<X>,
  seat: Seat<X>,
  aim: Aim<X>,
  answers: readonly string[],
  target: string,
): readonly Expected[] {
  const ask = asking(aim.act.input, seat.words);
  const field = ask.next(answers, target);
  const stops = (value: string) => aim.act.stops?.(ask.sofar([...answers, value]), seat.state(), target, seat.now());
  if (field?.kind === "one")
    return field.options.flatMap(option => {
      const why = stops(option.title);
      return why === undefined ? [] : [{ value: option.title, why }];
    });
  if (field?.kind !== "pick") return [];
  const source = program.registry.find(tool => tool.id === field.of);
  const among = aim.act.among?.(ask.sofar(answers), seat.state(), target, seat.now())[field.of];
  return (source?.targets(seat.state()) ?? []).flatMap(value => {
    if (value === target || source?.closed?.(seat.state(), value, seat.now())) return [];
    const why = among?.(value) ?? stops(value);
    return why === undefined ? [] : [{ value, why }];
  });
}
function assertChoice<X extends Program>(seat: Seat<X>, walk: Walk, field: Field, expected: Expected, hidden: boolean) {
  ok(expected.why.trim());
  const detail = expected.why === toolTexts.unchanged ? surfaceTexts.current : expected.why;
  const choices = "options" in field ? field.options : [];
  const options = field.kind === "pick" ? field.found("") : choices;
  const matches = (option: Option) => (option.value ?? option.title) === expected.value;
  const option = options.find(matches);
  if (hidden && field.kind === "pick") {
    strictEqual(option, undefined);
    return;
  }
  ok(option, promiseTexts.blockedLost);
  strictEqual(option.off, true, promiseTexts.blockedEnabled);
  strictEqual(option.detail, detail, promiseTexts.blockedReason);
  if (field.kind === "pick") {
    const found = field.found(field.shown(expected.value)).find(matches);
    ok(found?.off);
    strictEqual(found.detail, detail);
    const firstOff = options.findIndex(row => row.off);
    ok(options.slice(firstOff).every(row => row.off));
  }
  const openedWalk = { ...walk, ...opened(field) };
  ok(!options[openedWalk.at]?.off);
  const body = walkBody(openedWalk, field, 0);
  const row = body.kind === "thread" ? body.options?.find(matches) : undefined;
  ok(row?.off && !row.selected);
  if (field.kind === "pick") strictEqual(row.key, undefined);
  const onBlocked = { ...openedWalk, at: options.indexOf(option) };
  const intent = field.kind === "many" ? ({ kind: "type", text: " " } as const) : ({ kind: "confirm" } as const);
  deepStrictEqual(walking([onBlocked], onBlocked, seat.tools, intent, 0), { session: [onBlocked] });
  if (option.key)
    deepStrictEqual(walking([openedWalk], openedWalk, seat.tools, { kind: "type", text: option.key }, 0), {
      session: [openedWalk],
    });
}
function checkCase<X extends Program>(
  program: Composition<X>,
  seat: Seat<X>,
  aim: Aim<X>,
  kase: Case<X>,
  hidden: boolean,
) {
  const ask = asking(aim.act.input, seat.words);
  const answers = ask.answers(kase.input);
  const target = kase.on ?? aim.tool.id;
  const initial = begin(seat.tools, aim.tool.id, aim.name, aim.act.on === "thing" ? target : undefined);
  for (let pos = 0; pos < answers.length; pos++) {
    const prefix = answers.slice(0, pos);
    const walk = { ...initial, answers: prefix, pos };
    const field = fieldOf(seat.tools, walk);
    if (field?.kind === "pick") field.found("");
    else optionsOf(field);
    closedChoices(program, seat, field);
    manyChoices(seat, aim, walk, target);
    for (const expected of blocked(program, seat, aim, prefix, target)) {
      ok(field);
      assertChoice(seat, walk, field, expected, hidden);
    }
  }
}
const choiceCheck = <X extends Program>(
  program: Composition<X>,
  shown: Shown<X>,
  aim: Aim<X>,
  kase: Case<X>,
): Check => ({
  name: label(aim, promiseTexts.blockedChoices(kase.promise)),
  run: () =>
    staged(program, async ({ house }) => {
      await given(house(), aim.tool.id, kase.given, kase.at);
      const seat = seated(house(), kase.by ?? cast.admin, shown);
      try {
        checkCase(program, seat, aim, kase, false);
        await prefer(seat, "off", true);
        checkCase(program, seat, aim, kase, true);
      } finally {
        seat.router.stop();
      }
    }),
});
export const choiceChecks = <X extends Program>(program: Composition<X>, shown: Shown<X>): readonly Check[] =>
  program.registry.flatMap(tool =>
    Object.entries(tool.acts).flatMap(([name, act]) =>
      act.cases.map(kase => choiceCheck(program, shown, { tool, name, act }, kase)),
    ),
  );
