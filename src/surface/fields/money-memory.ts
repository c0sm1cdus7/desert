// A number belongs to the currency in which it was written, including while the house changes underneath it.
import type { Field } from "../contract.ts";
import type { Walk } from "../walk-state.ts";
type Next = (answers: readonly string[]) => Field | null;
export function renewedMoney(walk: Walk, next: Next): Walk {
  if (walk.phase !== "asking") return walk;
  const changed = walk.asked
    .slice(0, walk.pos)
    .findIndex(
      (was, index) => was.currency !== undefined && was.currency !== next(walk.answers.slice(0, index))?.currency,
    );
  const currency = next(walk.answers.slice(0, walk.pos))?.currency ?? "";
  if (changed < 0 && (walk.currency === undefined || walk.currency === currency)) return walk;
  const pos = changed < 0 ? walk.pos : changed;
  const { error: _error, ignored: _ignored, failed: _failed, was: _was, until: _until, ...rest } = walk;
  return {
    ...rest,
    pos,
    floor: Math.min(walk.floor, pos),
    answers: walk.answers.slice(0, pos),
    asked: walk.asked.slice(0, pos),
    typed: "",
    caret: 0,
    suggested: false,
    marks: [],
    at: 0,
    currency: next(walk.answers.slice(0, pos))?.currency ?? "",
  };
}
/** An old initial value is not a suggestion in another currency. */
export function nextMoneyAnswer(next: Next, walk: Walk, answers: readonly string[]): string | undefined {
  const before = next(walk.answers.slice(0, walk.pos + 1));
  const after = next(answers.slice(0, walk.pos + 1));
  const changed = before?.currency !== undefined && before.currency !== after?.currency;
  return changed ? "" : answers[walk.pos + 1];
}
