// What a question offers: eligible things first, then the things it cannot take with their reasons.
import { programCall } from "../../tools/boundaries/program-call.ts";
import { declaredCause, programRule } from "../../tools/execution/program-causes.ts";
import type { ProgramAct } from "../../tools/promises.ts";
import type { Program, State } from "../../tools/tool-contract.ts";
import type { Field } from "../contract.ts";
import { disabled, narrowed } from "./questions/picked-options.ts";
import type { Asking } from "./asking.ts";

/** A thing is never picked for what is done to itself. */
export function besides(field: Field | null, target?: string): Field | null {
  if (field?.kind !== "pick" || target === undefined) return field;
  const others = (sought: string) => field.found(sought).filter(option => option.value !== target);
  return { ...field, found: others, valid: answer => answer !== target && (field.valid?.(answer) ?? true) };
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
    const check = (read: () => string | undefined) => programRule(() => declaredCause(act.refuses, read()));
    const stops = (answer: string) =>
      declaredCause(
        act.refuses,
        programCall(act.stops?.bind(act), ask.sofar([...answers, answer]), state(), target, now()),
      );
    if (field?.kind === "one")
      return { ...field, options: field.options.map(option => disabled(option, stops(option.title))) };
    if (field?.kind !== "pick") return field;
    const choices = programCall(act.among?.bind(act), ask.sofar(answers), state(), target, now());
    const among = choices?.[field.of]?.bind(choices);
    return narrowed(field, value => check(() => (value ? among?.(value) : undefined)) ?? stops(value), hidden);
  };

/** A first question with no answer and no available maker closes the action where it would be opened. */
export const withoutChoices = (field: Field | null): string | undefined =>
  field?.kind === "pick" && !field.found("").some(option => !option.off) ? field.nothing() : undefined;
