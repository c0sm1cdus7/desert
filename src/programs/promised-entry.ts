// Every intermediate screen reached by keys is a question, not an action result: no Error and no unusable Enter.
import { deepStrictEqual, ok } from "node:assert/strict";
import type { Field, Screen } from "../surface/contract.ts";
import type { Router } from "../surface/router.ts";
import { promiseTexts as said } from "../texts/promises.texts.ts";
import { unchangedIn } from "./read-screen.ts";
import { surfaceTexts } from "../texts/surface.texts.ts";
import { view } from "./promised-keys.ts";
export const quietEntry = (router: Router): void => quietScreen(router.screen(view));
export function quietScreen(screen: Screen): void {
  ok(!unchangedIn(screen.body));
  if (screen.body.kind !== "thread") return;
  const options = screen.body.options;
  if (options && !options.some(row => row.entry)) {
    ok(
      options.some(row => !row.off && !row.still) || !!screen.body.more?.above || !!screen.body.more?.below,
      said.emptyQuestion,
    );
    ok(!options.some(row => row.off && row.selected), said.disabledCursor);
  }
  for (const event of screen.body.events) {
    const text = event.text.map(span => span.text).join("");
    ok(!event.text.some(span => span.tone === "cut"), text);
    ok(!text.startsWith(`${surfaceTexts.error} `), said.questionError);
    if (!screen.body.entry || !event.nested) continue;
    ok(event.text.every(span => span.tone === "t3"));
    if (!event.ignored) ok(!screen.hints.some(hint => hint.intent === "confirm"));
  }
}
export function quietly<T>(router: Router, use: (guarded: Router) => T): T {
  quietEntry(router);
  return use({
    ...router,
    send: intent => {
      const stays = router.send(intent);
      quietEntry(router);
      return stays;
    },
  });
}
/** A reason may change; the entire question, written value and navigation must stay identical. */
function withReason(screen: Screen, reason: string | undefined, ignored = false): Screen {
  if (reason === undefined || screen.body.kind !== "thread") return screen;
  const advice = ignored ? { ignored: true as const } : {};
  const event = { nested: true, text: [{ text: reason, tone: "t3" as const }], ...advice };
  return { ...screen, body: { ...screen.body, events: [...screen.body.events.filter(event => !event.nested), event] } };
}
/** Unavailable Enter keeps the question and its value, adding the declared submitted reason if it has one. */
export function confirmAnswer(router: Router, field?: Field, typed = ""): void {
  const before = router.screen(view);
  router.send({ kind: "confirm" });
  if (!before.hints.some(hint => hint.intent === "confirm"))
    deepStrictEqual(router.screen(view), withReason(before, field?.wrong?.(typed, true)));
}
/** Each case also tries an unavailable Enter and a key its field cannot take, on the actual written value. */
export function probeWritten(router: Router, field: Field, typed: string): void {
  if (!router.screen(view).hints.some(hint => hint.intent === "confirm")) confirmAnswer(router, field, typed);
  const before = router.screen(view);
  if (!("mask" in field)) return;
  const key = Array.from("a9 .-").find(key =>
    field.mask.rejected ? field.mask.rejected(typed, key) !== undefined : field.mask.put(typed, key) === typed,
  );
  if (key === undefined) return;
  router.send({ kind: "type", text: key });
  deepStrictEqual(router.screen(view), withReason(before, field.mask.rejected?.(typed, key), true));
}
/** A prefix that can still become the case's valid value has no reason line, only its unfilled shape. */
export function writeAnswer(router: Router, field: Field, given: string): void {
  const quietPrefix = (typed: string): void => {
    if (field.valid?.(given) !== true || field.valid(typed)) return;
    const { body } = router.screen(view);
    ok(body.kind !== "thread" || !body.events.some(event => event.nested && !event.ignored), said.partialReason);
    ok(!router.screen(view).hints.some(hint => hint.intent === "confirm"));
    if (body.kind === "thread" && typed && "mask" in field)
      deepStrictEqual(body.entry?.padding, field.mask.padding?.(typed) || undefined);
    confirmAnswer(router, field, typed);
  };
  /** Numeric cases also try a leading zero: canonical answers may omit the zeros a person starts with. */
  if ("mask" in field && field.mask.put("", "0") === "0" && field.valid?.("0") === false) {
    router.send({ kind: "type", text: "0" });
    quietPrefix("0");
    router.send({ kind: "erase" });
  }
  let typed = "";
  quietPrefix(typed);
  for (const char of Array.from(given)) {
    router.send({ kind: "type", text: char });
    typed = "mask" in field ? field.mask.put(typed, char) : typed + char;
    quietPrefix(typed);
  }
}
