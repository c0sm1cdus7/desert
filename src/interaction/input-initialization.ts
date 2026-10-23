type InputShape = { type?: unknown; items?: unknown };
const stringItems = (schema: InputShape) => Boolean(schema.items && typeof schema.items === "object"
  && "type" in schema.items && schema.items.type === "string");

/** Published text and label values are editable. Attached assets need a fresh
 * staging input and cannot be initialized as though they belonged to a new run. */
export function canInitializeInput(input: InputShape | undefined, fact: InputShape | undefined): boolean {
  return Boolean(input && fact && input.type === fact.type &&
    (input.type === "string" || input.type === "array" && stringItems(input) && stringItems(fact)));
}
export function isInitialInputValue(schema: InputShape | undefined, value: unknown): value is string | readonly string[] {
  return schema?.type === "string" ? typeof value === "string"
    : schema?.type === "array" && stringItems(schema) && Array.isArray(value) && value.every(item => typeof item === "string");
}
