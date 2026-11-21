// Validates each condition against declared fields and evaluates it with verifiable data and clock.
import { Value } from "@sinclair/typebox/value";
import type { TSchema, Static } from "@sinclair/typebox";
import { fieldSchema, numericField, fieldValue, actorKind } from "./rule-fields.ts";
import { ruleDefinition, ruleValue, type Predicate, type RuleContext } from "./rule-schema.ts";
import { rulesTexts as words } from "../../texts/rules.texts.ts";
const literal = (value: Static<typeof ruleValue>) => (value.kind === "null" ? null : value.value);
/** Bound before recursive schema validation, including direct callers that supply cyclic objects. */
function bounded(value: unknown, depth = 0, budget = { left: 1024 }): boolean {
  if (depth > 24 || --budget.left < 0) return false;
  if (typeof value === "number") return Number.isFinite(value);
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value !== "object") return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  return Reflect.ownKeys(descriptors).every(key => {
    if (typeof key !== "string") return false;
    const descriptor = descriptors[key];
    return descriptor !== undefined && "value" in descriptor && bounded(descriptor.value, depth + 1, budget);
  });
}
export function ruleProblem(value: unknown, input: TSchema | undefined): string | undefined {
  if (!bounded(value) || !Value.Check(ruleDefinition, value)) return words.invalid;
  if (!input) return words.action;
  return predicateProblem(value.condition, input);
}
export function predicateProblem(predicate: Predicate, input: TSchema): string | undefined {
  if (predicate.operator === "all" || predicate.operator === "any")
    return predicate.conditions.map(child => predicateProblem(child, input)).find(Boolean);
  if (predicate.operator === "not") return predicateProblem(predicate.condition, input);
  if (predicate.operator === "schedule") return predicate.from === predicate.until ? words.invalid : undefined;
  if (predicate.operator === "actor" || predicate.operator === "always") return undefined;
  const schema = fieldSchema(predicate.field, input);
  if (!schema) return words.field;
  if (predicate.operator === "equal") return Value.Check(schema, literal(predicate.value)) ? undefined : words.type;
  if (predicate.operator === "in")
    return predicate.values.every(item => Value.Check(schema, literal(item))) ? undefined : words.type;
  return numericField(schema) ? undefined : words.type;
}
export function evaluatePredicate(predicate: Predicate, context: RuleContext): boolean {
  if (predicate.operator === "all") return predicate.conditions.every(child => evaluatePredicate(child, context));
  if (predicate.operator === "any") return predicate.conditions.some(child => evaluatePredicate(child, context));
  if (predicate.operator === "not") return !evaluatePredicate(predicate.condition, context);
  if (predicate.operator === "always") return true;
  if (predicate.operator === "actor")
    return (
      actorKind(context.actor) === predicate.kind && (predicate.id === undefined || predicate.id === context.actor)
    );
  if (predicate.operator === "schedule") {
    const date = new Date(context.now + predicate.offsetMinutes * 60000);
    const minute = date.getUTCHours() * 60 + date.getUTCMinutes();
    const overnight = predicate.from > predicate.until;
    const day = overnight && minute < predicate.until ? (date.getUTCDay() + 6) % 7 : date.getUTCDay();
    return (
      predicate.days.includes(day) &&
      (overnight
        ? minute >= predicate.from || minute < predicate.until
        : minute >= predicate.from && minute < predicate.until)
    );
  }
  const value = fieldValue(predicate.field, context);
  if (predicate.operator === "equal") return value === literal(predicate.value);
  if (predicate.operator === "in") return predicate.values.some(item => value === literal(item));
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  if (predicate.operator === "gt") return value > predicate.value;
  if (predicate.operator === "gte") return value >= predicate.value;
  if (predicate.operator === "lt") return value < predicate.value;
  return value <= predicate.value;
}
