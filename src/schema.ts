import type { FieldDefinition, ObjectDefinition } from "./contracts.ts";
import { AssetReferenceSchema } from "./assets/types.ts";
import { inputPropertySchema, type InputPropertySchema, type JourneyInputSchema } from "./input-schema.ts";
import { labelsValueSchema } from "./labels.ts";
import { acceptedKinds, acceptsOnlyImages } from "./media/rendition-policy.ts";

/** A TypeBox schema as the JSON it serialises to, narrowed to the emitted subset. */
const asJson = (schema: object) => inputPropertySchema(JSON.parse(JSON.stringify(schema)));

export function emitField(field: FieldDefinition): InputPropertySchema {
  if (field.kind === "file") {
    // The value names its media kind unless the fact accepts only images (src/assets/types.ts fileValue).
    const media: InputPropertySchema = acceptsOnlyImages(field.accept) ? { type: "string", const: "image" }
      : { type: "string", enum: [...acceptedKinds(field.accept)] };
    const { kind, reference } = AssetReferenceSchema.properties;
    return asJson({ ...AssetReferenceSchema, properties: { kind, reference, media } });
  }
  if (field.kind === "labels") return field.reference ? {type:'array',maxItems:field.maxItems,uniqueItems:true,
    items:{type:'string',minLength:36,maxLength:36,pattern:'^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$'}}
    : asJson(labelsValueSchema(field));
  if (field.kind === "enum") return { type: "string", enum: [...field.values] };
  if (field.kind === "principal") return { type: "string", minLength: 1 };
  if (field.kind === "text") {
    if (field.minLength !== undefined && field.maxLength !== undefined && field.minLength > field.maxLength) {
      throw new Error("Invalid definition: contradictory text range");
    }
    return {
      type: "string",
      ...(field.minLength === undefined ? {} : { minLength: field.minLength }),
      ...(field.maxLength === undefined ? {} : { maxLength: field.maxLength }),
    };
  }
  const minimum = field.minimum ?? Number.MIN_SAFE_INTEGER;
  const maximum = field.maximum ?? Number.MAX_SAFE_INTEGER;
  if (minimum > maximum) throw new Error("Invalid definition: contradictory integer range");
  return { type: "integer", minimum, maximum };
}

export function emitObject(definition: ObjectDefinition): JourneyInputSchema {
  const facts = Object.entries(definition.facts).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  return {
    type: "object",
    properties: Object.fromEntries(facts.map(([name, field]) => [name, emitField(field)])),
    required: facts.map(([name]) => name),
    additionalProperties: false,
  };
}
