// Every intermediate screen reached by keys is a question, not an action result: no Error and no unusable Enter.
import { deepStrictEqual, ok } from "node:assert/strict";
import type { Field, Screen } from "../surface/contract.ts";
import type { Router } from "../surface/router.ts";
import { promiseTexts as said } from "../texts/promises.texts.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { surfaceTexts } from "../texts/surface.texts.ts";
import { view } from "./promised-keys.ts";

export const quietEntry = (router: Router): void => quietScreen(router.screen(view));
export function quietScreen(screen: Screen): void {
  ok(!JSON.stringify(screen.body).includes(toolTexts.unchanged));
  if (screen.body.kind !== "thread") return;
  const options = screen.body.options;
  if (options && !options.some(row => row.entry)) {
    ok(
      options.some(row => !row.off && !row.still),
      said.emptyQuestion,
    );
    ok(!options.some(row => row.off && row.selected), said.disabledCursor);
  }
  for (const event of screen.body.events) {
    ok(!event.text.some(span => span.tone === "cut"));
    ok(
      !event.text
        .map(span => span.text)
        .join("")
        .startsWith(`${surfaceTexts.error} `),
    );
    if (!screen.body.entry || !event.nested) continue;
    ok(event.text.every(span => span.tone === "t3"));
    ok(!screen.hints.some(hint => hint.intent === "confirm"));
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
/** Pressing an Enter that is not offered is harmless, down to the question and its written value. */
export function confirmAnswer(router: Router): void {
  const before = router.screen(view);
  router.send({ kind: "confirm" });
  if (!before.hints.some(hint => hint.intent === "confirm")) deepStrictEqual(router.screen(view), before);
}

/** Each case also tries an unavailable Enter and a key its field cannot take, on the actual written value. */
export function probeWritten(router: Router, field: Field, typed: string): void {
  const before = router.screen(view);
  if (!before.hints.some(hint => hint.intent === "confirm")) confirmAnswer(router);
  if (!("mask" in field)) return;
  const key = Array.from("a9 .-").find(key => field.mask.put(typed, key) === typed);
  if (key === undefined) return;
  router.send({ kind: "type", text: key });
  deepStrictEqual(router.screen(view), before);
}
