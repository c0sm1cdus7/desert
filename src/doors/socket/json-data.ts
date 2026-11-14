// The request must survive JSON persistence without dropping or changing any value.
export function jsonData(value: unknown): boolean {
  const pending = [value];
  const seen = new Set<object>();
  while (pending.length) {
    const item = pending.pop();
    if (item === null || typeof item === "string" || typeof item === "boolean") continue;
    if (typeof item === "number") {
      if (!Number.isFinite(item) || Object.is(item, -0)) return false;
      continue;
    }
    if (typeof item !== "object" || seen.has(item)) return false;
    seen.add(item);
    const children = jsonChildren(item);
    if (!children) return false;
    for (const child of children) pending.push(child);
  }
  return true;
}
function jsonChildren(value: object): unknown[] | undefined {
  const keys = Object.keys(value);
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype) return;
    if (keys.length !== value.length || Reflect.ownKeys(value).length !== value.length + 1) return;
    for (let index = 0; index < value.length; index++) if (!Object.hasOwn(value, index)) return;
  } else {
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return;
    if (Reflect.ownKeys(value).length !== keys.length) return;
  }
  const children: unknown[] = [];
  for (const key of keys) {
    const property = Object.getOwnPropertyDescriptor(value, key);
    if (!property || !("value" in property)) return;
    children.push(property.value);
  }
  return children;
}
