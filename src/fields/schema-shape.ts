// Validates schemas and remembers only those that cannot change in any of their branches.
import { TypeGuard, type TSchema } from "@sinclair/typebox";
const valid = new WeakSet<object>();
const immutable = new WeakSet<object>();
function frozen(value: unknown, seen = new WeakSet<object>()): boolean {
  if (value === null || typeof value !== "object") return true;
  if (immutable.has(value) || seen.has(value)) return true;
  if (!Object.isFrozen(value)) return false;
  seen.add(value);
  const whole = Reflect.ownKeys(value).every(key => {
    const property = Object.getOwnPropertyDescriptor(value, key);
    return property !== undefined && "value" in property && frozen(property.value, seen);
  });
  if (whole) immutable.add(value);
  return whole;
}
export function isSchema(value: unknown): value is TSchema {
  if (value !== null && typeof value === "object" && valid.has(value)) return true;
  if (!TypeGuard.IsSchema(value)) return false;
  if (frozen(value)) valid.add(value);
  return true;
}
export const isImmutableSchema = (schema: unknown): boolean => frozen(schema);
