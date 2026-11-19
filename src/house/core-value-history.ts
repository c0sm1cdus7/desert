// Read historical door and rule values without changing saved records or accepting them in new emissions.
import { Type, type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { object } from "../fields/visible-text.ts";
import { isRecord } from "../fields/json-values.ts";
import { doorFacts } from "./doors/door-facts.ts";
import { ruleFacts } from "./rules/rule-facts.ts";
import { ruleDefinition } from "./rules/rule-schema.ts";
const oldDoor = Type.Union([Type.Literal("agente"), Type.Literal("terminal")]);
const oldEffect = Type.Union([Type.Literal("frena"), Type.Literal("requiere-supervisor")]);
export const historicalCoreFacts = {
  "door-key-issued": object({ ...doorFacts["door-key-issued"].properties, door: oldDoor }),
  "door-invitation-issued": object({ ...doorFacts["door-invitation-issued"].properties, door: oldDoor }),
  "rule-versioned": object({
    ...ruleFacts["rule-versioned"].properties,
    definition: object({ ...ruleDefinition.properties, effect: oldEffect }),
  }),
  "rule-evaluated": object({
    ...ruleFacts["rule-evaluated"].properties,
    results: Type.Array(
      object({
        ...ruleFacts["rule-evaluated"].properties.results.items.properties,
        outcome: Type.Union([Type.Literal("passed"), oldEffect]),
      }),
    ),
  }),
};
function effectName(value: unknown) {
  if (value === "frena") return "block";
  return value === "requiere-supervisor" ? "require-supervisor" : value;
}
export function currentCoreValue(value: unknown): unknown {
  if (!isRecord(value) || value.layer !== "house" || typeof value.kind !== "string") return value;
  const schema = Object.entries(historicalCoreFacts).find(([kind]) => kind === value.kind)?.[1];
  if (!schema || !validHistorical(schema, value.data) || !isRecord(value.data)) return value;
  const data = value.data;
  if (value.kind === "door-key-issued" || value.kind === "door-invitation-issued")
    return { ...value, data: { ...data, door: data.door === "agente" ? "agent" : data.door } };
  if (value.kind === "rule-versioned" && isRecord(data.definition))
    return {
      ...value,
      data: { ...data, definition: { ...data.definition, effect: effectName(data.definition.effect) } },
    };
  if (value.kind === "rule-evaluated" && Array.isArray(data.results))
    return {
      ...value,
      data: {
        ...data,
        results: data.results.map((result: unknown) =>
          isRecord(result) ? { ...result, outcome: effectName(result.outcome) } : result,
        ),
      },
    };
  return value;
}

function validHistorical(schema: TSchema, data: unknown): boolean {
  return Value.Check(schema, data);
}
