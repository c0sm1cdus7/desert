// A memoized membrane: reading one part never copies or walks the rest of the house.
export type DeepReadonly<T> = T extends Date
  ? Omit<Date, `set${string}`>
  : T extends ReadonlyMap<infer K, infer V>
    ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
    : T extends ReadonlySet<infer V>
      ? ReadonlySet<DeepReadonly<V>>
      : T extends (...args: never[]) => unknown
        ? T
        : T extends object
          ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
          : T;
const views = new WeakMap<object, object>();
const sources = new WeakMap<object, object>();
const refuse = (): never => {
  throw new TypeError("A program cannot mutate its input state");
};
function source<T>(value: T): T;
function source(value: unknown): unknown {
  return typeof value === "object" && value !== null ? (sources.get(value) ?? value) : value;
}
/** Internal type preservation lets folds keep their declared shape; State exposes DeepReadonly to programs. */
export function readonlyState<T>(value: T): T;
export function readonlyState(value: unknown): unknown {
  if (typeof value !== "object" || value === null || sources.has(value)) return value;
  const known = views.get(value);
  if (known) return known;
  const target = Array.isArray(value) ? [] : shell(value);
  const proxy: object = new Proxy(target, {
    set: refuse,
    deleteProperty: refuse,
    defineProperty: refuse,
    setPrototypeOf: refuse,
    preventExtensions: refuse,
    ownKeys: () => Reflect.ownKeys(value),
    has: (_, key) => Reflect.has(value, key),
    getOwnPropertyDescriptor: (_, key) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
      if (!descriptor) return undefined;
      return {
        configurable: key !== "length" || !Array.isArray(value),
        enumerable: descriptor.enumerable ?? false,
        writable: true,
        value: readMember(value, key, proxy),
      };
    },
    get: (_, key) => {
      if (value instanceof Map || value instanceof Set) return collection(value, key, proxy);
      if (value instanceof Date && typeof key === "string" && key in Date.prototype) {
        if (key.startsWith("set")) return refuse;
        const member: unknown = Reflect.get(Date.prototype, key);
        if (typeof member === "function" && key !== "constructor")
          return (...args: unknown[]): unknown => Reflect.apply(member, value, args);
      }
      return readMember(value, key, proxy);
    },
  });
  views.set(value, proxy);
  sources.set(proxy, value);
  return proxy;
}
function collection(value: Map<unknown, unknown> | Set<unknown>, key: PropertyKey, proxy: object): unknown {
  if (["set", "add", "delete", "clear"].includes(String(key))) return refuse;
  if (key === "size") return value.size;
  if (key === "has") return (item: unknown) => value.has(source(item));
  if (key === "get" && value instanceof Map) return (item: unknown) => readonlyState(value.get(source(item)));
  if (key === "forEach")
    return (visit: (v: unknown, k: unknown, all: object) => void, self?: unknown) => {
      value.forEach((v, k) => visit.call(self, readonlyState(v), readonlyState(k), proxy));
    };
  if (key === Symbol.iterator || key === "entries" || key === "keys" || key === "values")
    return function* () {
      const iterator = iteration(value, key);
      for (const item of iterator) yield readonlyState(item);
    };
  return readMember(value, key, proxy);
}
/** A calculation may reuse parts of its input. Strip only membrane references from its returned data. */
export function stateResult<T>(value: T): T;
export function stateResult(value: unknown): unknown {
  return stateResultWithSeen(value, new WeakMap());
}
function stateResultWithSeen(value: unknown, seen: WeakMap<object, object>): unknown {
  if (typeof value !== "object" || value === null) return value;
  const raw = source(value);
  if (raw !== value) return raw;
  const known = seen.get(value);
  if (known) return known;
  // Already observed parts contain no membrane references and need no traversal.
  if (views.has(value)) return value;
  const copy = emptyCopy(value);
  seen.set(value, copy);
  if (value instanceof Map && copy instanceof Map) {
    for (const [key, item] of value) copy.set(copyResult(key, seen), copyResult(item, seen));
  } else if (value instanceof Set && copy instanceof Set) {
    for (const item of value) copy.add(copyResult(item, seen));
  } else {
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
      if (!descriptor) continue;
      if ("value" in descriptor) descriptor.value = copyResult(descriptor.value, seen);
      Reflect.defineProperty(copy, key, descriptor);
    }
  }
  return copy;
}

function emptyCopy(value: object): object {
  if (value instanceof Map) return new Map<unknown, unknown>();
  if (value instanceof Set) return new Set<unknown>();
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return [];
  return shell(value);
}
const copyResult = (value: unknown, seen: WeakMap<object, object>): unknown => stateResultWithSeen(value, seen);

function shell(value: object): object {
  const prototype: unknown = Object.getPrototypeOf(value);
  const copy: unknown = Object.create(typeof prototype === "object" ? prototype : null);
  if (typeof copy !== "object" || copy === null) throw new TypeError("Invalid state object");
  return copy;
}
function readMember(value: object, key: PropertyKey, receiver: object): unknown {
  const member: unknown = Reflect.get(value, key, receiver);
  return readonlyState(member);
}
function iteration(
  value: Map<unknown, unknown> | Set<unknown>,
  key: PropertyKey,
): Iterator<unknown> & Iterable<unknown> {
  if (key === Symbol.iterator) return value[Symbol.iterator]();
  if (key === "keys") return value.keys();
  if (key === "values") return value.values();
  return value.entries();
}
