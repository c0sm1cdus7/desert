// The answers a walk keeps past one that changed: each stays under the question it answered.
import type { Field } from "./contract.ts";
import type { Asking } from "./screen.ts";

type Asked = Readonly<{ next: (answers: readonly string[]) => Field | null }>;
/** What was answered after a question, under the questions asked now that its answer changed. An answer can decide
 * whether a later field is asked at all: each answer stays with the question it answered, and what answered a
 * question that is no longer asked goes. Where two of those questions read the same, they stay only while what is
 * asked does. */
export function keptAfter(act: Asked, walk: Asking, answer: string): readonly string[] {
  const was = walk.answers.slice(walk.pos + 1).map((given, offset) => {
    const ask = act.next(walk.answers.slice(0, walk.pos + 1 + offset))?.ask;
    return { ask, given };
  });
  const apart = new Set(was.map(each => each.ask)).size === was.length;
  const answers = [...walk.answers.slice(0, walk.pos), answer];
  for (let at = 0; ; at++) {
    const field = act.next(answers);
    if (!field || field.kind === "confirm") break;
    const same = was[at]?.ask === field.ask ? was[at] : undefined;
    const kept = same ?? (apart ? was.find(each => each.ask === field.ask) : undefined);
    if (!kept) break;
    answers.push(kept.given);
  }
  return answers.slice(walk.pos + 1);
}

/** The answers after this choice, retaining only those whose questions still exist. */
export function answersAfter(act: Asked, walk: Asking, answer: string): readonly string[] {
  const current = act.next(walk.answers.slice(0, walk.pos));
  const written = current?.kind === "text" || current?.kind === "secret";
  const kept = walk.until !== undefined || walk.answers[walk.pos] === answer || (walk.carried === true && written);
  return [...walk.answers.slice(0, walk.pos), answer, ...(kept ? keptAfter(act, walk, answer) : [])];
}
