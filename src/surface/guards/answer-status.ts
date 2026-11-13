// A question's live reason and whether its answer can advance come from the same declarations.
import { toolTexts } from "../../texts/tools.texts.ts";
import type { Field } from "../contract.ts";
import type { Walk } from "../screen.ts";

type Act = Readonly<{ stops?: (answers: readonly string[]) => string | undefined }>;
export function withStops(walk: Walk, field: Field, act: Act): Field {
  const stop = (answer: string): string | undefined => act.stops?.([...walk.answers.slice(0, walk.pos), answer]);
  if (field.kind === "many") {
    const options = field.options.map(option => {
      const marks = walk.marks.includes(option.title)
        ? walk.marks.filter(mark => mark !== option.title)
        : [...walk.marks, option.title];
      const why = stop(marks.join(" · "));
      return why === undefined ? option : { ...option, off: true, detail: why };
    });
    return { ...field, options, wrong: stop };
  }
  if (field.kind !== "text" && field.kind !== "secret") return field;
  const wrong = (typed: string): string | undefined => {
    const reason = field.wrong?.(typed);
    if (reason !== undefined) return reason;
    if (!(field.valid ?? (value => value.trim() !== ""))(typed)) return undefined;
    const stopped = stop(typed);
    return stopped === toolTexts.unchanged ? undefined : stopped;
  };
  const unchanged = (value: string) => field.unchanged?.(value) === true || stop(value) === toolTexts.unchanged;
  return { ...field, wrong, unchanged };
}
