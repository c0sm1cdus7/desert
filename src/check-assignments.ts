import type { FieldDefinition, ObjectDefinition } from "./contracts.ts";
import type { ExpressionDefinition } from "./program-grammar.ts";
import { emitField } from "./schema.ts";
import { requireField } from "./references.ts";
import { createShapeValidator } from "./validation.ts";

function acceptsAll(target: FieldDefinition, source: FieldDefinition) {
  if (target.kind !== source.kind) return false;
  if (target.kind === "text" && source.kind === "text") {
    return (source.minLength ?? 0) >= (target.minLength ?? 0)
      && (source.maxLength ?? Infinity) <= (target.maxLength ?? Infinity);
  }
  if (target.kind === "integer" && source.kind === "integer") {
    return (source.minimum ?? Number.MIN_SAFE_INTEGER) >= (target.minimum ?? Number.MIN_SAFE_INTEGER)
      && (source.maximum ?? Number.MAX_SAFE_INTEGER) <= (target.maximum ?? Number.MAX_SAFE_INTEGER);
  }
  if (target.kind === "enum" && source.kind === "enum") return source.values.every(value => target.values.includes(value));
  if (target.kind === "labels" && source.kind === "labels") {
    return source.maxItems <= target.maxItems && source.maxLength <= target.maxLength;
  }
  return true;
}

export function checkLiteral(field: FieldDefinition, value: unknown, name: string) {
  if (field.kind === "asset") throw new Error(`Asset assignment requires input: ${name}`);
  if (field.kind === "labels" && (!Array.isArray(value) || value.length)) throw new Error(`Labels assignment requires input: ${name}`);
  if (!createShapeValidator(emitField(field))(value).valid) throw new Error(`Invalid literal: ${name}`);
}

export function checkAssignments(object: ObjectDefinition, input: string[], assignments: Record<string, ExpressionDefinition>) {
  for (const [name, expression] of Object.entries(assignments)) {
    const target = requireField(object, name);
    if (expression.kind === "literal") {
      if (target.kind === "principal") throw new Error("Principal assignment requires actor");
      checkLiteral(target, expression.value, name);
    } else if (expression.kind === "actor") {
      if (target.kind !== "principal") throw new Error(`Actor assignment requires principal: ${name}`);
    } else {
      if (!input.includes(expression.field)) throw new Error(`Unknown input field: ${expression.field}`);
      if (!acceptsAll(target, requireField(object, expression.field))) throw new Error(`Incompatible input assignment: ${name}`);
    }
  }
}
