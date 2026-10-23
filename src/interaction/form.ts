import type { Mutation } from "../web/types.ts";
import type { ResolvedInputId } from "./catalog.ts";
import { requireFieldRepresentation, type FieldRepresentation } from "../field-representation.ts";
import { assetInputMedia } from "./image-input.ts";

const inputPrimitives = { text: "input.text", paragraphs: "input.multiline" } as const satisfies Record<Exclude<FieldRepresentation, "image" | "tags">, ResolvedInputId>;

export function deriveForm(journey: Mutation, representations: Readonly<Record<string, FieldRepresentation>>) {
  return journey.inputFields.map(name => {
    const schema = journey.inputSchema.properties[name]!;
    const representation = requireFieldRepresentation(representations, `${journey.object}.${name}`);
    if (representation === "image") {
      if (schema.type !== "object") throw new Error("UNSUPPORTED_FORM_PRIMITIVE");
      return { name, primitive: "control.files" as const, required: journey.inputSchema.required.includes(name), schema,media:assetInputMedia(schema) };
    }
    if (representation === "tags") {
      if (schema.type !== "array" || typeof schema.maxItems !== "number" || typeof schema.items !== "object"
        || !schema.items || Array.isArray(schema.items) || !("maxLength" in schema.items) || typeof schema.items.maxLength !== "number") throw new Error("UNSUPPORTED_FORM_PRIMITIVE");
      return { name, primitive: "control.labels" as const, required: false,
        limits: { maxItems: schema.maxItems, maxLength: schema.items.maxLength }, schema };
    }
    if (schema.type === "string" && Array.isArray(schema.enum) && schema.enum.every(value => typeof value === "string" && value.length > 0)) {
      return { name, primitive: "control.select" as const, required: false, schema,
        options: schema.enum.map(value => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1), disabled: false })) };
    }
    if (schema.type !== "string" || schema.enum) throw new Error("UNSUPPORTED_FORM_PRIMITIVE");
    return { name, primitive: inputPrimitives[representation],
      // JSON Schema required means presence; the control's required means nonempty.
      required: journey.inputSchema.required.includes(name) && typeof schema.minLength === "number" && schema.minLength > 0, schema };
  });
}
