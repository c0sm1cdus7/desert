// An offered answer keeps its reason, while unchanged is the same current fact regardless of its source.
import type { Language } from "../../../fields/languages.ts";
import { said, type Text } from "../../../fields/phrases.ts";
import { uniqueCurrent, orderedThings } from "../../session/current-field.ts";
import { answerChange, answerValidity } from "../../../tools/inputs/answer-change.ts";
import type { Field, Option } from "../../contract/contract.ts";
/** Off for its reason; an answer off because it is the one kept as it is says so, and is the current one. */
export const disabled = (option: Option, why: Text | undefined, language: Language): Option => {
  if (why === undefined) return option;
  const change = answerChange(why);
  const current = change.unchanged ? { current: true as const } : {};
  return { ...option, off: true, detail: said(change.detail ?? why, language), ...current };
};
/** None and making a thing remain available; rejected things stay visible unless the person hides disabled rows. */
export function narrowed(
  field: Field & { kind: "pick" },
  why: (value: string) => Text | undefined,
  hidden: () => boolean,
  language: Language,
) {
  const reasonOf = (value: string): Text | undefined => {
    const reason = why(value);
    const invalid = answerValidity(field.valid?.(value), field.wrong?.(value));
    return answerChange(reason).unchanged && invalid !== undefined ? invalid : (reason ?? invalid);
  };
  const wrong = (value: string): string | undefined => {
    const reason = reasonOf(value);
    return reason === undefined ? undefined : said(reason, language);
  };
  const found = (sought: string): readonly Option[] => {
    const rows = field
      .found(sought)
      .map(option => disabled(option, option.makes ? undefined : reasonOf(option.value ?? ""), language));
    uniqueCurrent(rows);
    return orderedThings(rows.filter(row => !row.off || !hidden()));
  };
  return {
    ...field,
    found,
    wrong,
    valid: (answer: string) => field.valid?.(answer) !== false && wrong(answer) === undefined,
  };
}
