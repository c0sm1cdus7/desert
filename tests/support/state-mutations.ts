// Deliberately hostile JavaScript, without changing the public read-only TypeScript contracts.
export function member(value: unknown, key: PropertyKey): object {
  if (typeof value !== "object" || value === null) throw new Error("Missing test object");
  const next: unknown = Reflect.get(value, key);
  if (typeof next !== "object" || next === null) throw new Error("Missing test member");
  return next;
}
export function mutate(value: object, method: PropertyKey, ...args: unknown[]): unknown {
  const action: unknown = Reflect.get(value, method);
  if (typeof action !== "function") throw new Error("Missing test method");
  return Reflect.apply(action, value, args);
}
