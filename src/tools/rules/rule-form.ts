// Agrega preguntas de superficie a los mismos datos tipados y despliega combinaciones acotadas.
import { Type, type TSchema } from "@sinclair/typebox";
import { isRecord } from "../../fields/json-values.ts";
import { predicateSchema } from "../../house/rules/rule-schema.ts";
import { ruleFormTexts as words } from "../../texts/rules.texts.ts";
import { deepFreeze } from "../../journal/vocabulary.ts";
const forms = new WeakMap<TSchema, TSchema>();
const labels: Readonly<Record<string, string>> = words.fields;
const choices: Readonly<Record<string, { title: string; key: string }>> = words.options;
function decorated(value: Record<string, unknown>): Record<string, unknown> {
  const result = { ...value };
  delete result.$id;
  if (typeof value.const === "string") {
    const choice = choices[value.const];
    if (choice) Object.assign(result, choice);
  }
  if (value.type === "array") result.more = words.more;
  if (value.type === "string" && value.const === undefined)
    Object.assign(result, { plain: true, placeholder: value.placeholder ?? words.example });
  if (value.type === "integer" || value.type === "number") result.mask = "number";
  return result;
}
function leaf(arm: unknown): boolean {
  if (!isRecord(arm) || !isRecord(arm.properties)) return true;
  const operator = arm.properties.operator;
  return !isRecord(operator) || !["all", "any", "not"].includes(String(operator.const));
}
function named(value: unknown, title: string): unknown {
  return isRecord(value) ? { ...value, title: typeof value.title === "string" ? value.title : title } : value;
}
function visit(value: unknown, depth: number, seen: WeakMap<object, Map<number, unknown>>): unknown {
  if (Array.isArray(value)) return value.map(item => visit(item, depth, seen));
  if (!isRecord(value)) return value;
  const known = seen.get(value)?.get(depth);
  if (known) return known;
  if (value.$ref === "MechanicalPredicate") return visit(predicateSchema, depth + 1, seen);
  if (value.type === "boolean")
    return Type.Union([
      Type.Literal(true, { title: words.yes, key: "s" }),
      Type.Literal(false, { title: words.no, key: "n" }),
    ]);
  const result = decorated(value);
  if (isRecord(value.properties))
    result.properties = Object.fromEntries(
      Object.entries(value.properties).map(([key, child]) => [
        key,
        named(visit(child, depth, seen), labels[key] ?? words.field),
      ]),
    );
  if (value.items) result.items = named(visit(value.items, depth, seen), words.field);
  if (Array.isArray(value.anyOf)) {
    const arms: unknown[] = value.anyOf;
    result.anyOf = arms.filter(arm => depth < 3 || leaf(arm)).map(arm => visit(arm, depth, seen));
  }
  const levels = seen.get(value) ?? new Map<number, unknown>();
  levels.set(depth, result);
  seen.set(value, levels);
  return result;
}
export function ruleForm<S extends TSchema>(schema: S): S;
export function ruleForm(schema: TSchema): TSchema {
  const known = forms.get(schema);
  if (known) return known;
  const result = visit(schema, 0, new WeakMap());
  if (!isRecord(result)) throw new Error("Invalid rule form");
  const form = Type.Unsafe(result);
  deepFreeze(form);
  forms.set(schema, form);
  return form;
}
