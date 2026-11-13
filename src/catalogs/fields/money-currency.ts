// Currency belongs to the question; the stored amount remains an integer number of cents.
import { programCall } from "../../tools/boundaries/program-call.ts";
export type Currency<State = unknown> =
  | string
  | ((answered: Readonly<Record<string, unknown>>, state: State, target: string, at: number) => string | undefined);
const decides = (value: unknown): value is Exclude<Currency, string> => typeof value === "function";
export function currencyIn(
  declared: unknown,
  answered: Readonly<Record<string, unknown>>,
  state: unknown,
  target: string,
  at: number,
): string | undefined {
  const symbol = decides(declared) ? programCall(declared, answered, state, target, at) : declared;
  if (symbol === undefined) return undefined;
  if (typeof symbol !== "string" || symbol.trim() === "" || /[\r\n]/u.test(symbol))
    throw new Error("A money field needs a currency symbol");
  return symbol;
}
