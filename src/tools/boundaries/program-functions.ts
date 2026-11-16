// A custom surface returns callbacks too; keep their origin when they run after composition.
import { failureOrigin } from "./failure-origin.ts";
import { OutsideDefect, BaseFailure } from "../../fields/program-call.ts";

const callable = (value: unknown): value is (...args: unknown[]) => unknown => typeof value === "function";
const failed = (error: unknown): never => {
  throw error instanceof OutsideDefect || error instanceof BaseFailure ? error : new OutsideDefect(error);
};
function ownedFunctions<T extends object>(value: T, failure: (error: unknown) => never): T {
  return new Proxy(value, {
    get(target, key): unknown {
      const member: unknown = Reflect.get(target, key);
      if (!callable(member)) return member;
      return (...args: unknown[]) => {
        try {
          const result: unknown = member.apply(target, args);
          return result instanceof Promise ? result.catch(failure) : result;
        } catch (error) {
          return failure(error);
        }
      };
    },
  });
}

export const programFunctions = <T extends object>(value: T): T => ownedFunctions(value, failed);
export const baseFunctions = <T extends object>(value: T): T =>
  ownedFunctions(value, error => {
    error = failureOrigin(error);
    throw error instanceof OutsideDefect || error instanceof BaseFailure ? error : new BaseFailure(error);
  });
