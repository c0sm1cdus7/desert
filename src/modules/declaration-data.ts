/** Read declaration data without executing getters before the JSON/schema boundary. */
export function declarationRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new Error("INVALID_DECLARATION_DATA");
  if (Object.getOwnPropertySymbols(value).length) throw new Error("INVALID_DECLARATION_DATA");
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const entries = Object.entries(descriptors).map(([key, descriptor]) => {
    if (!("value" in descriptor) || !descriptor.enumerable) throw new Error("INVALID_DECLARATION_DATA");
    return [key, descriptor.value] as const;
  });
  return Object.fromEntries(entries);
}

export function declarationArray(value: unknown): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error("INVALID_DECLARATION_DATA");
  if (Object.getOwnPropertySymbols(value).length) throw new Error("INVALID_DECLARATION_DATA");
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.keys(descriptors).length !== value.length + 1) throw new Error("INVALID_DECLARATION_DATA");
  return Array.from({ length: value.length }, (_, index) => {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) throw new Error("INVALID_DECLARATION_DATA");
    return descriptor.value;
  });
}
