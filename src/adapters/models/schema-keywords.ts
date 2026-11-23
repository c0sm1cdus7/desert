// Rejects unknown schema keywords and distinguishes local field metadata from JSON validation.
const surfaceKeywords = [
  "plain",
  "said",
  "placeholder",
  "verbatim",
  "mask",
  "currency",
  "suggests",
  "last",
  "of",
  "none",
  "makes",
  "empty",
  "some",
  "key",
  "more",
  "shapes",
  "width",
  "allowed",
  "max",
  "when",
  "secret",
];
// These checks stay in the action engine; they cannot be serialized as provider constraints.
export const localKeywords = new Set([...surfaceKeywords, "wrong", "decimals"]);
const validationKeywords = new Set([
  "type",
  "properties",
  "required",
  "additionalProperties",
  "items",
  "enum",
  "const",
  "anyOf",
  "oneOf",
  "allOf",
  "$ref",
  "$defs",
  "definitions",
  "$id",
  "description",
  "title",
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "pattern",
  "format",
  "minItems",
  "maxItems",
  "uniqueItems",
  "contains",
  "minContains",
  "maxContains",
  "minProperties",
  "maxProperties",
  "default",
]);
export function checkSchemaKeywords(schema: unknown, seen = new Set<object>()): void {
  if (typeof schema === "boolean") return;
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) throw new Error("schema");
  if (seen.has(schema)) return;
  seen.add(schema);
  for (const [key, value] of Object.entries(schema)) {
    const child: unknown = value;
    if (localKeywords.has(key)) continue;
    if (!validationKeywords.has(key)) throw new Error(`schema keyword: ${key}`);
    if (["properties", "$defs", "definitions"].includes(key)) {
      if (!child || typeof child !== "object" || Array.isArray(child)) throw new Error(`schema ${key}`);
      Object.values(child).forEach(node => checkSchemaKeywords(node, seen));
    } else if (["anyOf", "oneOf", "allOf"].includes(key)) {
      if (!Array.isArray(value)) throw new Error("schema branches");
      value.forEach(child => checkSchemaKeywords(child, seen));
    } else if (["items", "contains", "additionalProperties"].includes(key)) checkSchemaKeywords(value, seen);
  }
}
