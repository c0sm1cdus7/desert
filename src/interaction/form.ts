import type { Mutation } from "../web/types.ts";
import type { InputPrimitive } from "./catalog.ts";

export function deriveForm(journey: Mutation, presentations: Readonly<Record<string, InputPrimitive>>) {
  return journey.inputFields.map(name => {
    const schema = journey.inputSchema.properties[name]!;
    if (schema.type !== "string" || schema.enum) throw new Error("UNSUPPORTED_FORM_PRIMITIVE");
    return { name, primitive: presentations[`${journey.object}.${name}`] ?? "input.text",
      // JSON Schema required means presence; the control's required means nonempty.
      required: journey.inputSchema.required.includes(name) && typeof schema.minLength === "number" && schema.minLength > 0, schema };
  });
}
