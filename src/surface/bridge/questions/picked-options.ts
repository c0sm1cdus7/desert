// An offered answer keeps its reason, while unchanged is the same current fact regardless of its source.
import { uniqueCurrent } from "../../current-field.ts";
import { answerChange, answerValidity } from "../../../tools/answers/answer-change.ts";
import type { Field, Option } from "../../contract.ts";
export const disabled = (option: Option, why: string | undefined): Option =>
  why === undefined ? option : { ...option, off: true, detail: answerChange(why).detail ?? why };
/** None and making a thing remain available; rejected things stay visible unless the person hides disabled rows. */
export function narrowed(
  field: Field & { kind: "pick" },
  why: (value: string) => string | undefined,
  hidden: () => boolean,
) {
  const wrong = (value: string) => {
    const reason = why(value);
    const invalid = answerValidity(field.valid?.(value), field.wrong?.(value));
    return answerChange(reason).unchanged && invalid !== undefined ? invalid : (reason ?? invalid);
  };
  const found = (sought: string): readonly Option[] => {
    const rows = field
      .found(sought)
      .map(option => disabled(option, option.makes ? undefined : wrong(option.value ?? "")));
    uniqueCurrent(rows);
    return [...rows.filter(row => !row.off), ...rows.filter(row => row.off && !hidden())];
  };
  return {
    ...field,
    found,
    wrong,
    valid: (answer: string) => field.valid?.(answer) !== false && wrong(answer) === undefined,
  };
}
