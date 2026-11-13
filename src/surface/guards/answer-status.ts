// A question's live reason and whether its answer can advance come from the same declarations.
import { answerChange } from "../../tools/answers/answer-change.ts";
import type { Field } from "../contract.ts";
import type { Walk } from "../screen.ts";

type Act = Readonly<{ stops?: (answers: readonly string[]) => string | undefined }>;
export function withStops(walk: Walk, field: Field, act: Act): Field {
  const stop = (answer: string): string | undefined => act.stops?.([...walk.answers.slice(0, walk.pos), answer]);
  const unchanged = (value: string) =>
    answerChange(field.wrong?.(value) ?? stop(value), field.unchanged?.(value)).unchanged;
  if (field.kind === "many") {
    const options = field.options.map(option => {
      const marks = walk.marks.includes(option.title)
        ? walk.marks.filter(mark => mark !== option.title)
        : [...walk.marks, option.title];
      const ordered = field.options.filter(option => marks.includes(option.title)).map(option => option.title);
      const why = answerChange(stop(ordered.join(" · "))).reason;
      return why === undefined ? option : { ...option, off: true, detail: why };
    });
    return { ...field, options, wrong: value => answerChange(stop(value)).reason, unchanged };
  }
  if (field.kind !== "text" && field.kind !== "secret") return field;
  const wrong = (typed: string): string | undefined => {
    const reason = field.wrong?.(typed);
    if (reason !== undefined) return answerChange(reason).reason;
    if (!(field.valid ?? (value => value.trim() !== ""))(typed)) return undefined;
    const stopped = stop(typed);
    return answerChange(stopped).reason;
  };
  return { ...field, wrong, unchanged };
}
