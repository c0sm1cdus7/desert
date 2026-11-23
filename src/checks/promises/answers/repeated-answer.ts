// Each declared case supplies a state: repeating today's answers must stop at the last question, before running.
import { said } from "../../../fields/phrases.ts";
import type { Language } from "../../../fields/languages.ts";
import { promiseTexts } from "../../../texts/promises.texts.ts";
import { deepStrictEqual, ok } from "node:assert/strict";
import type { Intent } from "../../../surface/contract/contract.ts";
import { fieldOf, optionsOf, validOf, type Walk } from "../../../surface/session/screen.ts";
import type { Tool } from "../../../surface/contract/shown-tool.ts";
import { walking } from "../../../surface/acts/walking.ts";
import { walkBody, walkHints } from "../../../surface/acts/walk.ts";
import { unchangedIn } from "../../read-screen.ts";
import { surfaceTexts } from "../../../texts/surface.texts.ts";
/** No action is executed here: a request to run is itself a failed guarantee. */
const press = (tools: readonly Tool[], walk: Walk, key: Intent, language: Language): Walk => {
  const result = walking([walk], walk, tools, key, 0);
  ok(!result.run);
  const next = result.session.at(-1);
  ok(next?.kind === "act" && next.phase === "asking");
  ok(!unchangedIn(walkBody(next, fieldOf(tools, next), 0, language), language));
  return next;
};
export function repeat(tools: readonly Tool[], walk: Walk, answer: string, last: boolean, language: Language): Walk {
  const field = fieldOf(tools, walk);
  ok(field);
  if (field.kind === "text" || field.kind === "secret") {
    const length = Array.from(walk.typed).length;
    for (let erased = 0; erased < length; erased++) walk = press(tools, walk, { kind: "erase" }, language);
    for (const text of Array.from(answer)) walk = press(tools, walk, { kind: "type", text }, language);
    if (last) {
      ok(!validOf(field, walk.typed), promiseTexts.currentSent);
      ok(!walkHints(walk, field, tools, language).some(hint => hint.intent === "confirm"));
    }
    return press(tools, walk, { kind: "confirm" }, language);
  }
  if (field.kind === "many") {
    if (last) ok(!walkHints(walk, field, tools, language).some(hint => hint.intent === "confirm"));
    return press(tools, walk, { kind: "confirm" }, language);
  }
  const options = field.kind === "pick" ? field.found("") : optionsOf(field);
  const at = options.findIndex(option => (option.value ?? option.title) === answer);
  const option = options[at];
  ok(option && !options[walk.at]?.off);
  deepStrictEqual(option.off === true, last);
  deepStrictEqual(option.detail, said(surfaceTexts.current, language));
  if (field.kind === "pick") {
    if (last) return press(tools, { ...walk, at }, { kind: "confirm" }, language);
    const way = at < walk.at ? "up" : "down";
    while (walk.at !== at) walk = press(tools, walk, { kind: way }, language);
    return press(tools, walk, { kind: "confirm" }, language);
  }
  ok(option.key);
  return press(tools, walk, { kind: "type", text: option.key }, language);
}
