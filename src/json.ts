/** A JSON value: what contracts, validators and diagnostics carry instead of `unknown`. */
export type Json = null | boolean | string | number | readonly Json[] | { readonly [key: string]: Json };

export function jsonSnapshot(value: unknown, ancestors = new Set<object>()): Json {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "object" || value === null) throw new Error("Expected a JSON value");
  if (ancestors.has(value)) throw new Error("Cyclic JSON value");
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
    throw new Error("Expected a plain JSON object");
  }
  if (Object.getOwnPropertySymbols(value).length) throw new Error("Symbol keys are not JSON");
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Object.keys(descriptors);
  for (const key of keys) {
    const descriptor = descriptors[key]!;
    if (!("value" in descriptor)) throw new Error("Accessors are not JSON");
    if (!descriptor.enumerable && !(Array.isArray(value) && key === "length")) {
      throw new Error("Hidden properties are not JSON");
    }
  }
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      if (keys.length !== value.length + 1) throw new Error("Sparse or decorated arrays are not JSON");
      return Array.from({ length: value.length }, (_, index) => {
        const descriptor = descriptors[String(index)];
        if (!descriptor) throw new Error("Sparse arrays are not JSON");
        return jsonSnapshot(descriptor.value, ancestors);
      });
    }
    return Object.fromEntries(keys.sort().map(key => [key, jsonSnapshot(descriptors[key]!.value, ancestors)]));
  } finally { ancestors.delete(value); }
}

export type Frozen<T> = T extends object ? { readonly [K in keyof T]: Frozen<T[K]> } : T;

export function freezeDeep<T>(value: T): Frozen<T> {
  if (typeof value === "object" && value !== null) {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value as Frozen<T>;
}
