import type { ViewTarget } from "../modules/authored-types.ts";
import { declarationArray, declarationRecord } from "../modules/declaration-data.ts";
import { ActivityVersion, type ActivityPlan } from "./schema.ts";
import { activityJourney, type ActivityJourney, type ActivityExecution } from "./references.ts";

declare const inputType: unique symbol;
export type ActivityInput<K extends string = string, J extends string = string> = Readonly<{ [inputType]: { field: K; journey: J } }>;
export type ActivityDefinition<J extends ActivityJourney = ActivityJourney> = {
  readonly journey: J;
  readonly steps: readonly {
    readonly view: ViewTarget;
    readonly inputs: readonly ActivityInput<ActivityExecution<J>["command"]["input"][number], J["id"]>[];
    readonly when?: { readonly input: ActivityInput<ActivityExecution<J>["command"]["input"][number], J["id"]>;
      readonly comparison: "equals" | "not-equals"; readonly value: string | number };
  }[];
  readonly review: ViewTarget;
};
const fields = new WeakMap<object, { journey: object; field: string }>();

export function activityInputs<const J extends ActivityJourney>(journey: J) {
  return Object.freeze(Object.fromEntries(activityJourney(journey).command.input.map(field => {
    const token = Object.freeze({ field });
    fields.set(token, { journey, field });
    return [field, token];
  }))) as unknown as { readonly [K in ActivityExecution<J>["command"]["input"][number]]: ActivityInput<K, J["id"]> };
}

export function authoredActivity(definition: ActivityDefinition,
  resolveJourney: (value: object) => string, resolveView: (value: object) => string): ActivityPlan {
  const source = declarationRecord(definition);
  if (Object.keys(source).some(key => !["journey", "steps", "review"].includes(key))) throw new Error("UNKNOWN_ACTIVITY_SEMANTICS");
  const journey = source.journey as object;
  const resolveInput = (token: unknown) => {
    const field = typeof token === "object" && token !== null ? fields.get(token) : undefined;
    if (!field || field.journey !== journey) throw new Error("UNREGISTERED_ACTIVITY_INPUT");
    return field.field;
  };
  return { version: ActivityVersion, journey: resolveJourney(journey), review: resolveView(source.review as object),
    steps: declarationArray(source.steps).map(value => {
      const step = declarationRecord(value);
      if (Object.keys(step).some(key => !["view", "inputs", "when"].includes(key))) throw new Error("UNKNOWN_ACTIVITY_SEMANTICS");
      const condition = step.when === undefined ? undefined : declarationRecord(step.when);
      if (condition && Object.keys(condition).some(key => !["input", "comparison", "value"].includes(key))) {
        throw new Error("UNKNOWN_ACTIVITY_SEMANTICS");
      }
      return { view: resolveView(step.view as object), inputs: declarationArray(step.inputs).map(resolveInput),
        ...(condition ? { when: { ...condition, input: resolveInput(condition.input) } as NonNullable<ActivityPlan["steps"][number]["when"]> } : {}) };
    }) };
}
