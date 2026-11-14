// Object.freeze alone does not freeze Map/Set entries or their mutating methods.
export function frozenState<T>(state: T): T {
  const seen = new WeakSet<object>();
  const freeze = (value: unknown): void => {
    if (typeof value !== "object" || value === null || seen.has(value)) return;
    seen.add(value);
    const refuse = () => {
      throw new TypeError("A calculation cannot mutate its input state");
    };
    if (value instanceof Map || value instanceof Set) {
      for (const item of value instanceof Map ? [...value.entries()].flat() : value) freeze(item);
      const methods = value instanceof Map ? ["set", "delete", "clear"] : ["add", "delete", "clear"];
      for (const method of methods) Object.defineProperty(value, method, { value: refuse });
    } else if (value instanceof Date) {
      for (const method of Object.getOwnPropertyNames(Date.prototype).filter(name => name.startsWith("set")))
        Object.defineProperty(value, method, { value: refuse });
    } else Object.values(value).forEach(freeze);
    Object.freeze(value);
  };
  freeze(state);
  return state;
}
