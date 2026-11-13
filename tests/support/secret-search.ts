// Search decoded values, including UTF-16 strings, error causes and cyclic collections.
export function has(value: unknown, secret: string): boolean {
  const seen = new Set<object>();
  const visit = (item: unknown): boolean => {
    if (typeof item === "string") return item.includes(secret);
    if (!item || typeof item !== "object" || seen.has(item)) return false;
    seen.add(item);
    if (item instanceof Map && [...item].some(([key, value]) => visit(key) || visit(value))) return true;
    if (item instanceof Set && [...item].some(visit)) return true;
    return Reflect.ownKeys(item).some(key => {
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      return visit(String(key)) || (descriptor && "value" in descriptor && visit(descriptor.value));
    });
  };
  return visit(value);
}
