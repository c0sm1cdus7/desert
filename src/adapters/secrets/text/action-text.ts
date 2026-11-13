import type { SecretEntries } from "./secret-dictionary.ts";
// Only the current action's values are searched; replacement references are never searched again.

const replacementText = (values: SecretEntries) => {
  const entries = [...values].filter(([secret]) => secret.length).sort(([a], [b]) => b.length - a.length);
  const references = new Set(values.values());
  return (source: string): string => {
    let result = "";
    for (let index = 0; index < source.length;) {
      const candidate = /^secret:[0-9a-f-]{36}/u.exec(source.slice(index))?.[0];
      const existing = candidate && references.has(candidate) ? candidate : undefined;
      const match = entries.find(([secret]) => source.startsWith(secret, index));
      result += existing ?? match?.[1] ?? source[index] ?? "";
      index += existing?.length ?? match?.[0].length ?? 1;
    }
    return result;
  };
};
const shell = (item: object): object => {
  if (Array.isArray(item)) return [];
  if (item instanceof Map) return new Map<unknown, unknown>();
  if (item instanceof Set) return new Set<unknown>();
  const prototype: unknown = Object.getPrototypeOf(item);
  const copy: object = {};
  if (prototype === null || typeof prototype === "object") Object.setPrototypeOf(copy, prototype);
  return copy;
};
export function actionText<T>(value: T, values: SecretEntries, omitted = new Set<unknown>()): T {
  const text = replacementText(values);
  const seen = new Map<object, unknown>();
  const walk = (item: unknown): unknown => {
    if (omitted.has(item)) return "[secret]";
    if (typeof item === "string") return text(item);
    if (!item || typeof item !== "object") return item;
    if (seen.has(item)) return seen.get(item);
    if (item instanceof Date || item instanceof RegExp || ArrayBuffer.isView(item)) return structuredClone(item);
    const copy = shell(item);
    seen.set(item, copy);
    if (item instanceof Map && copy instanceof Map) for (const [key, value] of item) copy.set(walk(key), walk(value));
    if (item instanceof Set && copy instanceof Set) for (const value of item) copy.add(walk(value));
    for (const key of Reflect.ownKeys(item)) {
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (descriptor && "value" in descriptor)
        Object.defineProperty(copy, key, { ...descriptor, value: walk(descriptor.value) });
    }
    return copy;
  };
  return replaced(value, walk(value));
}

/** Replace a value without changing its static type; callers retain responsibility for schema validation. */
export function replaced<T>(original: T, value: unknown): T {
  const wrapper = { value: original };
  Object.defineProperty(wrapper, "value", { value });
  return wrapper.value;
}
