import { promiseTexts } from "../../texts/promises.texts.ts";
import { deepStrictEqual, ok } from "node:assert/strict";
import type { Intent } from "../../surface/contract.ts";
import { fieldOf, optionsOf, validOf, type Walk } from "../../surface/screen.ts";
import type { Tool } from "../../surface/shown-tool.ts";
import { walking } from "../../surface/walking.ts";
import { walkBody, walkHints } from "../../surface/walk.ts";
import { unchangedIn } from "../read-screen.ts";
import { surfaceTexts } from "../../texts/surface.texts.ts";
/** No action is executed here: a request to run is itself a failed guarantee. */
const press = (tools: readonly Tool[], walk: Walk, key: Intent): Walk => {
  const result = walking([walk], walk, tools, key, 0);
  ok(!result.run);
  const next = result.session.at(-1);
  ok(next?.kind === "act" && next.phase === "asking");
  ok(!unchangedIn(walkBody(next, fieldOf(tools, next), 0)));
  return next;
};
function repeat(tools: readonly Tool[], walk: Walk, answer: string, last: boolean): Walk {
  const field = fieldOf(tools, walk);
  ok(field);
  if (field.kind === "text" || field.kind === "secret") {
    const length = Array.from(walk.typed).length;
    for (let erased = 0; erased < length; erased++) walk = press(tools, walk, { kind: "erase" });
    for (const text of Array.from(answer)) walk = press(tools, walk, { kind: "type", text });
    if (last) {
      ok(!validOf(field, walk.typed), promiseTexts.currentSent);
      ok(!walkHints(walk, field, tools).some(hint => hint.intent === "confirm"));
    }
    return press(tools, walk, { kind: "confirm" });
  }
  if (field.kind === "many") {
    if (last) ok(!walkHints(walk, field, tools).some(hint => hint.intent === "confirm"));
    return press(tools, walk, { kind: "confirm" });
  }
  const options = field.kind === "pick" ? field.found("") : optionsOf(field);
  const at = options.findIndex(option => (option.value ?? option.title) === answer);
  const option = options[at];
  ok(option && !options[walk.at]?.off);
  deepStrictEqual(option.off === true, last);
  deepStrictEqual(option.detail, surfaceTexts.current);
  if (field.kind === "pick") {
    if (last) return press(tools, { ...walk, at }, { kind: "confirm" });
    const way = at < walk.at ? "up" : "down";
    while (walk.at !== at) walk = press(tools, walk, { kind: way });
    return press(tools, walk, { kind: "confirm" });
  }
  ok(option.key);
  return press(tools, walk, { kind: "type", text: option.key });
}
export function currentCloses(tools: readonly Tool[], initial: Walk): void {
  if (initial.was === undefined) return;
  const current = initial.was;
  const end = initial.until ?? current.length;
  let walk = initial;
  for (let index = initial.floor; index < end; index++) {
    const answer = current[index];
    ok(answer !== undefined);
    const last = index === end - 1;
    walk = repeat(tools, walk, answer, last);
    deepStrictEqual(walk.pos, last ? index : index + 1);
  }
}
