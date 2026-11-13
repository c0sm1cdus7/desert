// Currency belongs to the question; the stored amount remains an integer number of cents.
import { currencySymbol } from "../currency/currency-symbol.ts";
import { programCall } from "../../tools/boundaries/program-call.ts";
export type Currency<State = unknown> =
  | string
  | ((answered: Readonly<Record<string, unknown>>, state: State, target: string, at: number) => string | undefined);
const decides = (value: unknown): value is Exclude<Currency, string> => typeof value === "function";
export function currencyIn(
  declared: unknown,
  question: string,
  answered: Readonly<Record<string, unknown>>,
  state: unknown,
  target: string,
  at: number,
): string | undefined {
  const checked = (symbol: unknown) => (symbol === undefined ? undefined : currencySymbol(symbol, question));
  return decides(declared) ? programCall(() => checked(declared(answered, state, target, at))) : checked(declared);
}
