import { Ajv } from "ajv";
import { freezeDeep, jsonSnapshot } from "./json.ts";
import { inspectValidation } from "./validation-result.ts";

const engine = new Ajv({
  strict: true, allErrors: true, ownProperties: true,
  coerceTypes: false, removeAdditional: false, useDefaults: false,
});

export function createSchemaValidator<T>(schema: object) {
  return engine.compile<T>(schema);
}

// Schemas are trusted compiled artifacts, not arbitrary remote packages.
export function createShapeValidator(schema: object) {
  const snapshot = jsonSnapshot(schema);
  if (typeof snapshot !== "object" || snapshot === null || Array.isArray(snapshot)) {
    throw new Error("Expected an object schema");
  }
  freezeDeep<object>(snapshot);
  const validate = createSchemaValidator(snapshot);
  return (value: unknown) => inspectValidation(validate, value);
}
