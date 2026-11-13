// Evaluate the base's arguments first; only the callback itself belongs to the program.
import { programRule } from "../execution/program-causes.ts";

export function programCall<A extends unknown[], R>(call: (...args: A) => R, ...args: A): R;
export function programCall<A extends unknown[], R>(call: ((...args: A) => R) | undefined, ...args: A): R | undefined;
export function programCall<A extends unknown[], R>(call: ((...args: A) => R) | undefined, ...args: A): R | undefined {
  return programRule(() => call?.(...args));
}
