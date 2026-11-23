// Each declared case supplies a state: repeating today's answers must stop at the last question, before running.
import type { Language } from "../../../fields/languages.ts";
import { deepStrictEqual, ok } from "node:assert/strict";
import type { Tool } from "../../../surface/contract/shown-tool.ts";
import type { Walk } from "../../../surface/session/screen.ts";
import { repeat } from "./repeated-answer.ts";
export function currentCloses(tools: readonly Tool[], initial: Walk, language: Language): void {
  if (initial.was === undefined) return;
  const current = initial.was;
  const end = initial.until ?? current.length;
  let walk = initial;
  for (let index = initial.floor; index < end; index++) {
    const answer = current[index];
    ok(answer !== undefined);
    const last = index === end - 1;
    walk = repeat(tools, walk, answer, last, language);
    deepStrictEqual(walk.pos, last ? index : index + 1);
  }
}
