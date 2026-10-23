import type { FieldDefinition, ObjectDefinition } from "./contracts.ts";
import { AssetReferenceSchema } from "./assets/types.ts";
import { labelsValueSchema } from "./labels.ts";

export function emitField(field: FieldDefinition): Record<string, unknown> {
  if (field.kind === "asset") {
    const schema=JSON.parse(JSON.stringify(AssetReferenceSchema));
    schema.properties.media=field.media === "image" ? {type:"string",const:"image"} : {type:"string",enum:["image","video","audio"]};
    return schema;
  }
  if (field.kind === "labels") return field.reference ? {type:'array',maxItems:field.maxItems,uniqueItems:true,
    items:{type:'string',minLength:36,maxLength:36,pattern:'^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$'}}
    : JSON.parse(JSON.stringify(labelsValueSchema(field)));
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

export function emitObject(definition: ObjectDefinition) {
  const facts = Object.entries(definition.facts).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  return {
    type: "object",
    properties: Object.fromEntries(facts.map(([name, field]) => [name, emitField(field)])),
    required: facts.map(([name]) => name),
    additionalProperties: false,
  };
}
