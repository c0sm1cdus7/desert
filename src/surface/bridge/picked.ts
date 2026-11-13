// What a question offers: eligible things first, then the things it cannot take with their reasons.
import type { ProgramAct } from "../../tools/promises.ts";
import type { Program, State } from "../../tools/tool-contract.ts";
import type { Field, Option } from "../contract.ts";
import type { Asking } from "./asking.ts";

/** A thing is never picked for what is done to itself. */
export function besides(field: Field | null, target?: string): Field | null {
  if (field?.kind !== "pick" || target === undefined) return field;
  const others = (sought: string) => field.found(sought).filter(option => option.value !== target);
  return { ...field, found: others, valid: answer => answer !== target && (field.valid?.(answer) ?? true) };
}
const disabled = (option: Option, why: string | undefined): Option =>
  why === undefined ? option : { ...option, off: true, detail: why };
/** None and making a thing remain available; rejected things stay visible unless the person hides disabled rows. */
function narrowed(field: Field & { kind: "pick" }, why: (value: string) => string | undefined, hidden: () => boolean) {
  const found = (sought: string): readonly Option[] => {
    const rows = field
      .found(sought)
      .map(option => disabled(option, option.makes ? undefined : why(option.value ?? "")));
    return [...rows.filter(row => !row.off), ...rows.filter(row => row.off && !hidden())];
  };
  return { ...field, found, valid: (answer: string) => why(answer) === undefined && (field.valid?.(answer) ?? true) };
}
/** Each option is checked with the answers already given plus that option, before it is chosen. */
export const offeredOn =
  <X extends Program>(
    act: ProgramAct<X>,
    ask: Asking,
    state: () => State<X>,
    tool: string,
    now: () => number,
    hidden: () => boolean = () => false,
  ) =>
  (answers: readonly string[], target = tool): Field | null => {
    const field = besides(ask.next(answers), target);
    const stops = (answer: string) => act.stops?.(ask.sofar([...answers, answer]), state(), target, now());
    if (field?.kind === "one")
      return { ...field, options: field.options.map(option => disabled(option, stops(option.title))) };
    if (field?.kind !== "pick") return field;
    const among = act.among?.(ask.sofar(answers), state(), target, now())[field.of];
    return narrowed(field, value => (value ? among?.(value) : undefined) ?? stops(value), hidden);
  };

/** A first question with no answer and no available maker closes the action where it would be opened. */
export const withoutChoices = (field: Field | null): string | undefined =>
  field?.kind === "pick" && !field.found("").some(option => !option.off) ? field.nothing() : undefined;
