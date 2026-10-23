import { Type, type Static } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";

const closed = { additionalProperties: false };
const name = Type.String({ minLength: 1, maxLength: 200 });
const scalar = Type.Union([Type.String(), Type.Integer({ minimum: Number.MIN_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER })]);
export const ActivityVersion = "desert.activity/1" as const;
export const ActivityPlanSchema = Type.Object({
  version: Type.Literal(ActivityVersion),
  journey: name,
  steps: Type.Array(Type.Object({
    view: name,
    inputs: Type.Array(name, { minItems: 1, maxItems: 64, uniqueItems: true }),
    when: Type.Optional(Type.Object({ input: name, comparison: Type.Union([
      Type.Literal("equals"), Type.Literal("not-equals"),
    ]), value: scalar }, closed)),
  }, closed), { minItems: 1, maxItems: 32 }),
  review: name,
}, closed);
export type ActivityPlan = Frozen<Static<typeof ActivityPlanSchema>>;
export const ActivityOccurrenceSchema = Type.String({ pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$" });
export const ActivityListSchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  after: Type.Optional(ActivityOccurrenceSchema),
}, closed);
export type ActivityListOptions = Frozen<Static<typeof ActivityListSchema>>;
export type ActivityAnswers = Readonly<Record<string, Readonly<Record<string, string | number>>>>;
export type ActivityProgress = {
  readonly activeSteps: readonly number[];
  readonly completedSteps: readonly number[];
  readonly nextStep: number | null;
  readonly input: Readonly<Record<string, string | number>>;
};
