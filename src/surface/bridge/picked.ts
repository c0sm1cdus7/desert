// What a question that picks a thing offers, for the act that asks it: never the thing the act is done to, and only
// the things the act takes given what was answered so far.
import type { ProgramAct } from "../../tools/promises.ts";
import type { Program, State } from "../../tools/tool-contract.ts";
import type { Field, Option } from "../contract.ts";
import type { Asking } from "./asking.ts";

/** A thing is never picked for what is done to itself: it is not among the things an act on it asks to pick from. */
export function besides(field: Field | null, target?: string): Field | null {
  if (field?.kind !== "pick" || target === undefined) return field;
  const others = (sought: string) => field.found(sought).filter(option => option.value !== target);
  return { ...field, found: others, valid: answer => answer !== target && (field.valid?.(answer) ?? true) };
}
/** Only the things an act takes are offered where one is picked: picking none, and the act that makes a new one,
 * stay. */
function narrowed(field: Field | null, fits?: (thing: string) => boolean): Field | null {
  if (field?.kind !== "pick" || !fits) return field;
  const taken = ({ makes, value }: Option): boolean => makes !== undefined || !value || fits(value);
  const found = (sought: string) => field.found(sought).filter(taken);
  return { ...field, found, valid: answer => (answer === "" || fits(answer)) && (field.valid?.(answer) ?? true) };
}
/** The question an act asks next, as it is offered on the thing or the tool it is done to. */
export const offeredOn =
  <X extends Program>(act: ProgramAct<X>, ask: Asking, state: () => State<X>, tool: string) =>
  (answers: readonly string[], target?: string): Field | null => {
    const field = ask.next(answers);
    if (field?.kind !== "pick" || !act.among) return besides(field, target);
    return besides(narrowed(field, act.among(ask.sofar(answers), state(), target ?? tool)[field.of]), target);
  };
