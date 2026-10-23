import type { Application } from "../local/program.ts";
import type { Frozen } from "../json.ts";
import type { Mutation } from "../local/types.ts";
import type { ActivityPlan } from "./schema.ts";
import { loadDefinition } from "../compiled-definition.ts";

export function requireActivityCoverage(application: Application, journey: Frozen<Mutation>, plan: ActivityPlan) {
  const object = loadDefinition(application).objects.find(object => object.id === journey.command.object)!;
  if (journey.command.input.some(field => object.facts[field]?.kind === "asset")) {
    throw new Error("ACTIVITY_ASSET_STAGING_NOT_INSTALLED");
  }
  if (journey.command.input.some(field => object.facts[field]?.kind === "labels")) throw new Error("ACTIVITY_LABELS_NOT_INSTALLED");
  const inputs = new Set(journey.command.input), collected = new Set<string>();
  const decisions = new Map<string, (string | number | symbol)[]>();
  const schema = application.inputSchema(journey.command.id);
  for (const step of plan.steps) {
    if (step.inputs.some(field => !inputs.has(field))) throw new Error("UNKNOWN_ACTIVITY_INPUT");
    if (step.when) {
      const { input, value } = step.when;
      if (!collected.has(input)) throw new Error("ACTIVITY_CONDITION_REQUIRES_EARLIER_INPUT");
      const check = application.validateInput(journey.command.id, { [input]: value });
      if (check.issues.some(issue => issue.keyword !== "required")) throw new Error("INVALID_ACTIVITY_CONDITION_VALUE");
      const field = schema.properties[input] as { enum?: readonly (string | number)[] };
      const known = decisions.get(input) ?? (field.enum ? [...field.enum] : [Symbol("other-valid-value")]);
      if (!known.includes(value)) known.push(value);
      decisions.set(input, known);
    }
    step.inputs.forEach(field => collected.add(field));
  }
  let combinations: Record<string, string | number | symbol>[] = [{}];
  for (const [input, values] of decisions) {
    if (combinations.length * values.length > 256) throw new Error("ACTIVITY_BRANCH_LIMIT_EXCEEDED");
    combinations = combinations.flatMap(before => values.map(value => ({ ...before, [input]: value })));
  }
  for (const scenario of combinations) {
    const available = new Set<string>();
    for (const step of plan.steps) {
      if (step.when) {
        if (!available.has(step.when.input)) throw new Error("UNREACHABLE_ACTIVITY_CONDITION");
        const equal = scenario[step.when.input] === step.when.value;
        if (step.when.comparison === "equals" ? !equal : equal) continue;
      }
      if (step.inputs.some(field => available.has(field))) throw new Error("DUPLICATE_ACTIVE_ACTIVITY_INPUT");
      step.inputs.forEach(field => available.add(field));
    }
    if ([...inputs].some(field => !available.has(field))) throw new Error("INCOMPLETE_ACTIVITY_BRANCH");
  }
}
