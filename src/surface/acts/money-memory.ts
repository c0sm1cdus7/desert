// A number belongs to the currency in which it was written, including while the house changes underneath it.
import { same } from "../../fields/phrases.ts";
import { entryAdvice } from "../../texts/entry-advice.ts";
import type { Field } from "../contract/contract.ts";
import type { Walk } from "../session/walk-state.ts";
type Next = (answers: readonly string[]) => Field | null;
export function renewedMoney(walk: Walk, next: Next, stops?: (answers: readonly string[]) => string | undefined): Walk {
  if (walk.phase !== "asking") return walk;
  const changed = walk.asked
    .slice(0, walk.pos)
    .findIndex(
      (was, index) => was.currency !== undefined && was.currency !== next(walk.answers.slice(0, index))?.currency,
    );
  const currency = next(walk.answers.slice(0, walk.pos))?.currency ?? "";
  if (changed < 0 && (walk.currency === undefined || walk.currency === currency)) return walk;
  const pos = changed < 0 ? walk.pos : changed;
  const { was: _was, until: _until, ignored: _ignored, error: _error, ...rest } = walk;
  const answers = walk.answers.slice(0, pos);
  const field = next(answers);
  const checked =
    (!walk.failed && walk.error !== undefined) ||
    walk.notices?.some(notice => !notice.ignored && !same(notice.reason, entryAdvice.currencyChanged));
  const reason = field?.wrong?.("", !!checked) ?? stops?.([...answers, ""]);
  // Action failures and discarded keys survive independently of the emptied value.
  const error = walk.failed ? walk.error : reason;
  const notices = (walk.notices ?? []).filter(notice => notice.ignored);
  if (walk.ignored) notices.push({ reason: walk.ignored, ignored: true });
  return {
    ...rest,
    ...(error === undefined ? {} : { error }),
    pos,
    floor: Math.min(walk.floor, pos),
    answers,
    asked: walk.asked.slice(0, pos),
    typed: "",
    notices: [...notices, ...(walk.failed && reason ? [{ reason }] : []), { reason: entryAdvice.currencyChanged }],
    caret: 0,
    suggested: false,
    marks: [],
    at: 0,
    currency: field?.currency ?? "",
  };
}
/** An old initial value is not a suggestion in another currency. */
export function nextMoneyAnswer(next: Next, walk: Walk, answers: readonly string[]): string | undefined {
  const before = next(walk.answers.slice(0, walk.pos + 1));
  const after = next(answers.slice(0, walk.pos + 1));
  const changed = before?.currency !== undefined && before.currency !== after?.currency;
  return changed ? "" : answers[walk.pos + 1];
}
