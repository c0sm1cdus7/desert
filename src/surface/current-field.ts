import { OutsideDefect } from "../tools/outside.ts";
import { answerChange } from "../tools/answers/answer-change.ts";
import { surfaceTexts as said } from "../texts/surface.texts.ts";
import type { Field, Option } from "./contract.ts";
import { answersAfter } from "./kept-answers.ts";
import type { Walk } from "./screen.ts";
/** Stable ordering belongs to things only, after every rule has marked their availability. */
export function orderedThings(options: readonly Option[]): readonly Option[] {
  const sorted = [...options.filter(option => !option.off), ...options.filter(option => option.off)];
  const rows = sorted.map((option, index) => {
    if (option.off) {
      const { key: _key, ...off } = option;
      return off;
    }
    const key = option.key ?? (!option.makes && index < 9 ? String(index + 1) : undefined);
    return { ...option, ...(key === undefined ? {} : { key }) };
  });
  return rows;
}
export function uniqueCurrent(options: readonly Option[]): readonly Option[] {
  if (options.filter(option => option.detail === said.current && !option.makes).length > 1)
    throw new OutsideDefect("Two answers of the same question are unchanged");
  return options;
}
type Act = Readonly<{
  next: (answers: readonly string[]) => Field | null;
  same?: (answers: readonly string[], current: readonly string[]) => boolean;
}>;
export const markedCurrent = (field: Field, option: Option): Option => {
  const value = option.value ?? option.title;
  const current = field.kind !== "many" && field.current !== undefined && value === field.current;
  if (field.current !== undefined && option.detail === said.current) answerChange(undefined, true, current);
  const off = field.kind !== "many" && !option.makes && (field.unchanged?.(value) ?? (field.only === true && current));
  return { ...option, ...(current && !option.off ? { detail: said.current } : {}), ...(off ? { off: true } : {}) };
};
/** Match by question when a changed answer changes which questions exist; never put a value under another name. */
function currentAt(walk: Walk, field: Field, act: Act): string | undefined {
  const was = walk.was ?? [];
  const questions = was.map((_, index) => act.next(was.slice(0, index))?.ask);
  if (questions[walk.pos] === field.ask) return was[walk.pos];
  const matches = questions.flatMap((ask, index) => (ask === field.ask ? [index] : []));
  return matches.length === 1 ? was[matches[0] ?? -1] : undefined;
}
export function currentField(walk: Walk, field: Field, act: Act): Field {
  const was = walk.was;
  if (was === undefined || walk.phase !== "asking" || field.kind === "confirm") return field;
  const current = currentAt(walk, field, act);
  const unchanged = (answer: string): boolean => {
    const answers = answersAfter(act, walk, answer);
    const following = act.next(answers.slice(0, walk.pos + 1));
    if (walk.pos + 1 !== walk.until && following && following.kind !== "confirm") return false;
    const rest = act.next(answers);
    if (rest && rest.kind !== "confirm") return false;
    return act.same?.(answers, was) ?? (answers.length === was.length && answers.every((value, i) => value === was[i]));
  };
  const known = { ...field, ...(current === undefined ? {} : { current }), unchanged };
  return known.kind === "pick"
    ? {
        ...known,
        found: sought => orderedThings(uniqueCurrent(known.found(sought).map(option => markedCurrent(known, option)))),
      }
    : known;
}
