// Conserva versiones, aprobaciones, retiros y resultados mecánicos en hechos del core.
import { Type } from "@sinclair/typebox";
import { object } from "../../fields/visible-text.ts";
import { ruleDefinition } from "./rule-schema.ts";
const name = Type.String({ minLength: 1, maxLength: 160 });
const version = Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER });
export const ruleReference = object({ id: name, version });
export const ruleFacts = {
  "rule-versioned": object({ definition: ruleDefinition, version, previous: Type.Union([version, Type.Null()]) }),
  "rule-approved": ruleReference,
  "rule-retired": ruleReference,
  "rule-evaluated": object({
    action: object({ tool: name, act: name }),
    results: Type.Array(
      object({
        id: name,
        version,
        outcome: Type.Union([Type.Literal("passed"), Type.Literal("frena"), Type.Literal("requiere-supervisor")]),
      }),
    ),
  }),
};
