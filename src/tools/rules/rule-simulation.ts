// Evaluates public samples against the same effective input as execution, without action effects.
import { canSimulateInput, normalizedInput } from "../inputs/prepared-input.ts";
import { hasSecretInput } from "../inputs/secret-input.ts";
import { fine } from "../../fields/fields.ts";
import { publicSimulationInput, simulationSchema } from "./simulation-public-input.ts";
import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { object } from "../../fields/visible-text.ts";
import { evaluatePredicate, ruleProblem } from "../../house/rules/rule-predicate.ts";
import { ruleReference } from "../../house/rules/rule-facts.ts";
import { rulesTexts as words, ruleFormTexts as form } from "../../texts/rules.texts.ts";
import { programAct } from "../promises.ts";
import type { Program, State, ToolRegistry } from "../tool-contract.ts";
import type { RuleDefinition } from "../../house/rules/rule-schema.ts";
import { actionSchema } from "./rule-actions.ts";
import { ruleForm } from "./rule-form.ts";
const sampleSchema = Type.Array(
  object({
    actor: Type.String({ minLength: 1 }),
    input: Type.Unknown(),
    now: Type.Integer({ minimum: 0 }),
    inJourney: Type.Optional(Type.Boolean()),
  }),
  { minItems: 1, maxItems: 64 },
);
const input = object({
  ...ruleReference.properties,
  samples: Type.String({
    title: form.samples,
    placeholder: form.sample,
    plain: true,
    concealed: true,
    minLength: 1,
    maxLength: 32000,
  }),
});
function simulation<X extends Program>(value: unknown, state: State<X>, registry: ToolRegistry<X>, evaluate = false) {
  value = publicSimulationInput(value, state, registry);
  if (!Value.Check(input, value)) return { problem: form.casesInvalid };
  const version = state.house.rules.versions.get(value.id)?.find(each => each.version === value.version);
  if (!version) return { problem: words.missing };
  const { definition } = version;
  const schema = actionSchema(registry, definition.action.tool, definition.action.act);
  const problem = ruleProblem(definition, schema);
  if (problem || !schema) return { problem: problem ?? words.action };
  let samples: unknown;
  try {
    samples = JSON.parse(value.samples);
  } catch {
    return { problem: form.casesInvalid };
  }
  if (!Value.Check(sampleSchema, samples)) return { problem: form.casesInvalid };
  const action = registry.find(tool => tool.id === definition.action.tool)?.acts[definition.action.act];
  if (!action || !canSimulateInput(action, hasSecretInput(schema))) return { problem: form.unavailable };
  if (!evaluate) return {};
  const publicSchema = simulationSchema(schema);
  try {
    samples = samples.map(sample => ({ ...sample, input: normalizedInput(action, sample.input) }));
  } catch {
    return { problem: form.unavailable };
  }
  if (
    !Value.Check(sampleSchema, samples) ||
    samples.some(sample => !Value.Check(publicSchema, sample.input) || !fine(publicSchema, sample.input))
  )
    return { problem: form.casesInvalid };
  return { results: ruleOutcomes(definition, samples, state.house.admin) };
}
function ruleOutcomes(definition: RuleDefinition, samples: Static<typeof sampleSchema>, admin: string) {
  return samples.map(sample => ({
    actor: sample.actor,
    outcome: evaluatePredicate(definition.condition, { ...sample, admin, inJourney: sample.inJourney ?? false })
      ? definition.effect
      : "passed",
  }));
}

export function ruleSimulation<X extends Program>(registry: ToolRegistry<X>) {
  return programAct<X, typeof input, readonly [typeof form.casesInvalid, typeof form.unavailable]>({
    ...words.simulate,
    input: ruleForm(input),
    on: "tool",
    undoable: true,
    output: true,
    refuses: [form.casesInvalid, words.missing, words.action, words.invalid, words.field, words.type, form.unavailable],
    outside: [form.casesInvalid, form.unavailable],
    stops: (value, state) => (Value.Check(input, value) ? simulation(value, state, registry).problem : undefined),
    run: (value, { state }) => {
      const result = simulation(value, state, registry, true);
      if (!result.results)
        return {
          status: "rejected",
          reason: result.problem === form.casesInvalid ? form.casesInvalid : form.unavailable,
        };
      return { status: "accepted", text: JSON.stringify(result.results), value: result.results };
    },
    cases: [
      { promise: words.missing, input: { id: "absent", version: 1, samples: "[]" }, then: { refused: words.missing } },
    ],
  });
}
