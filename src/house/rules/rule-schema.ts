// Declara condiciones cerradas y versiones de reglas como datos, sin expresiones ejecutables.
import type { DeepReadonly } from "../../journal/readonly-state.ts";
import { Type, type Static } from "@sinclair/typebox";
import { object } from "../../fields/visible-text.ts";
const numeric = Type.Number({ minimum: -Number.MAX_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER });
const name = Type.String({ minLength: 1, maxLength: 160 });
export const ruleField = Type.Union([
  object({ source: Type.Literal("input"), path: name }),
  object({
    source: Type.Literal("core"),
    path: Type.Union([
      Type.Literal("admin"),
      Type.Literal("actor"),
      Type.Literal("actorKind"),
      Type.Literal("isAdmin"),
      Type.Literal("inJourney"),
    ]),
  }),
]);
export const ruleValue = Type.Union([
  object({ kind: Type.Literal("text"), value: Type.String({ maxLength: 4000 }) }),
  object({ kind: Type.Literal("number"), value: numeric }),
  object({ kind: Type.Literal("boolean"), value: Type.Boolean() }),
  object({ kind: Type.Literal("null") }),
]);
const minute = Type.Integer({ minimum: 0, maximum: 1439 });
export const predicateSchema = Type.Recursive(
  self =>
    Type.Union([
      object({ operator: Type.Literal("equal"), field: ruleField, value: ruleValue }),
      object({
        operator: Type.Literal("in"),
        field: ruleField,
        values: Type.Array(ruleValue, { minItems: 1, maxItems: 64 }),
      }),
      ...(["gt", "gte", "lt", "lte"] as const).map(operator =>
        object({ operator: Type.Literal(operator), field: ruleField, value: numeric }),
      ),
      object({
        operator: Type.Literal("actor"),
        kind: Type.Union([Type.Literal("identity"), Type.Literal("program"), Type.Literal("assistant")]),
        id: Type.Optional(name),
      }),
      object({
        operator: Type.Literal("schedule"),
        from: minute,
        until: minute,
        offsetMinutes: Type.Integer({ minimum: -840, maximum: 840 }),
        days: Type.Array(Type.Integer({ minimum: 0, maximum: 6 }), { minItems: 1, maxItems: 7, uniqueItems: true }),
      }),
      object({ operator: Type.Literal("all"), conditions: Type.Array(self, { minItems: 1, maxItems: 16 }) }),
      object({ operator: Type.Literal("any"), conditions: Type.Array(self, { minItems: 1, maxItems: 16 }) }),
      object({ operator: Type.Literal("not"), condition: self }),
      /** Holds for every act, so an admin can mark an act without inventing a condition (21/11). */
      object({ operator: Type.Literal("always") }),
    ]),
  { $id: "MechanicalPredicate" },
);
export const ruleDefinition = object({
  id: name,
  text: Type.String({ minLength: 1, maxLength: 4000 }),
  action: object({ tool: name, act: name }),
  condition: predicateSchema,
  effect: Type.Union([Type.Literal("block"), Type.Literal("require-supervisor")]),
});
export type Predicate = DeepReadonly<Static<typeof predicateSchema>>;
export type RuleDefinition = DeepReadonly<Static<typeof ruleDefinition>>;
export type RuleField = Static<typeof ruleField>;
export type RuleVersion = Readonly<{
  definition: RuleDefinition;
  version: number;
  previous: number | null;
  author: string;
  at: number;
  fact: string;
}>;
export type RuleContext = Readonly<{
  input: unknown;
  actor: string;
  admin: string;
  now: number;
  inJourney: boolean;
}>;
