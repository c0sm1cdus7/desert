// Removes schema-declared secret positions before simulation requests reach any public record.
import { Type, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { fine } from "../../fields/fields.ts";
import { isRecord } from "../../fields/json-values.ts";
import { ruleReference } from "../../house/rules/rule-facts.ts";
import { hasSecretInput } from "../inputs/secret-input.ts";
import type { Program, State, ToolRegistry } from "../tool-contract.ts";
import { actionSchema } from "./rule-actions.ts";

/** Combine alternative declarations conservatively, so a secret arm protects every shared position. */
function alternatives(schemas: readonly unknown[]): Readonly<Record<string, unknown>>[] {
  return schemas.flatMap(schema => {
    if (!isRecord(schema)) return [];
    return Array.isArray(schema.anyOf) ? alternatives(schema.anyOf) : [schema];
  });
}
const secretPosition = (schemas: readonly unknown[]) => alternatives(schemas).some(schema => schema.secret === true);
const childSchemas = (schemas: readonly unknown[], key: string) =>
  alternatives(schemas).map(schema => (isRecord(schema.properties) ? schema.properties[key] : undefined));
const itemSchemas = (schemas: readonly unknown[], index: number) =>
  alternatives(schemas).map((schema): unknown => (Array.isArray(schema.items) ? schema.items[index] : schema.items));
/** Omitted secret fields are not required to validate the remaining public input. */
export function simulationSchema(schema: TSchema, masks: readonly unknown[] = [schema]): TSchema {
  if (secretPosition(masks)) return Type.Unknown();
  const copy = { ...schema };
  if (isRecord(schema.properties)) {
    const properties = Object.fromEntries(
      Object.entries(schema.properties).flatMap(([key, child]) => {
        const children = childSchemas(masks, key);
        return isRecord(child) && !secretPosition(children)
          ? [[key, simulationSchema(Type.Unsafe(child), children)]]
          : [];
      }),
    );
    copy.properties = properties;
    if (Array.isArray(schema.required))
      copy.required = schema.required.filter((key: string) => Object.hasOwn(properties, key));
  }
  if (Array.isArray(schema.anyOf)) copy.anyOf = schema.anyOf.map((arm: TSchema) => simulationSchema(arm, masks));
  const items: unknown = schema.items;
  if (Array.isArray(items))
    copy.items = items.map((item: unknown, index: number) =>
      isRecord(item) ? simulationSchema(Type.Unsafe(item), itemSchemas(masks, index)) : item,
    );
  else if (isRecord(items)) copy.items = simulationSchema(Type.Unsafe(items), itemSchemas(masks, 0));
  return Type.Unsafe(copy);
}

/** Every union arm protects its positions, even when a malformed sample selects no valid arm. */
export function publicSimulationValue(schema: unknown, value: unknown): unknown {
  if (!isRecord(schema)) return value;
  if (schema.secret === true) return undefined;
  if (Array.isArray(schema.anyOf))
    return schema.anyOf.reduce((result, arm) => publicSimulationValue(arm, result), value);
  if (isRecord(schema.properties)) {
    if (!isRecord(value)) return hasSecretInput(schema) ? null : value;
    const properties = schema.properties;
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, child]) => {
        const projected = publicSimulationValue(properties[key], child);
        return projected === undefined ? [] : [[key, projected]];
      }),
    );
  }
  if (schema.items) {
    if (!Array.isArray(value)) return hasSecretInput(schema) ? null : value;
    return value.map(
      (item, index) =>
        publicSimulationValue(Array.isArray(schema.items) ? schema.items[index] : schema.items, item) ?? null,
    );
  }
  return value;
}
export function publicSimulationInput<X extends Program>(
  input: unknown,
  state: State<X>,
  registry: ToolRegistry<X>,
): unknown {
  if (!isRecord(input)) return {};
  const reference = { id: input.id, version: input.version };
  const empty = { ...reference, samples: "null" };
  if (!Value.Check(ruleReference, reference)) return empty;
  const rule = state.house.rules.versions.get(reference.id)?.find(each => each.version === reference.version);
  const schema = rule && actionSchema(registry, rule.definition.action.tool, rule.definition.action.act);
  if (!schema || typeof input.samples !== "string") return empty;
  try {
    const samples: unknown = JSON.parse(input.samples);
    if (!Array.isArray(samples)) return empty;
    return {
      ...reference,
      samples: JSON.stringify(
        samples.map(sample =>
          isRecord(sample) ? { ...sample, input: publicSimulationValue(schema, sample.input) } : null,
        ),
      ),
    };
  } catch {
    return empty;
  }
}

export function prepareSimulationAct<X extends Program>(
  value: import("../../house/own-acts.ts").Act,
  state: State<X>,
  registry: ToolRegistry<X>,
) {
  if (value.target !== "rules" || value.act !== "simulate") return value;
  const schema = registry.find(tool => tool.id === "rules")?.acts.simulate?.input;
  return schema && Value.Check(schema, value.input) && fine(schema, value.input)
    ? { ...value, input: publicSimulationInput(value.input, state, registry) }
    : undefined;
}
