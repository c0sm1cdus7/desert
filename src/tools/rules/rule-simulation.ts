// Evaluates public samples against the same effective input as execution, without action effects.
import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { OutsideDefect } from "../../fields/program-call.ts";
import { fine } from "../../fields/fields.ts";
import { object } from "../../fields/visible-text.ts";
import { ruleReference } from "../../house/rules/rule-facts.ts";
import { evaluatePredicate, ruleProblem } from "../../house/rules/rule-predicate.ts";
import type { RuleDefinition } from "../../house/rules/rule-schema.ts";
import { ruleFormTexts as form, rulesTexts as words } from "../../texts/rules.texts.ts";
import { canSimulateInput, normalizedInput } from "../inputs/prepared-input.ts";
import { hasSecretInput } from "../inputs/secret-input.ts";
import { programAct } from "../promises.ts";
import type { Program, State, ToolRegistry } from "../tool-contract.ts";
import { actionSchema } from "./rule-actions.ts";
import { simulationCases } from "./rule-cases.ts";
import { ruleForm } from "./rule-form.ts";
import { publicSimulationInput, simulationSchema } from "./simulation-public-input.ts";
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

/** Pure normalization may be reused for the same public sample and unchanged rule context. */
function simulationReader<X extends Program>(registry: ToolRegistry<X>) {
  let previous:
    | {
        input: string;
        versions: State<X>["house"]["rules"]["versions"];
        admin: string;
        result: ReturnType<typeof simulation<X>>;
      }
    | undefined;
  return (value: unknown, state: State<X>) => {
    const safe = publicSimulationInput(value, state, registry);
    const input = JSON.stringify(safe);
    const { versions } = state.house.rules;
    const { admin } = state.house;
    if (previous?.input === input && previous.versions === versions && previous.admin === admin) return previous.result;
    const result = simulation(safe, state, registry, true);
    previous = { input, versions, admin, result };
    return result;
  };
}
export function ruleSimulation<X extends Program>(registry: ToolRegistry<X>) {
  const evaluate = simulationReader(registry);
  return programAct<X, typeof input>({
    ...words.simulate,
    input: ruleForm(input),
    on: "tool",
    undoable: true,
    output: true,
    refuses: [form.casesInvalid, words.missing, form.unavailable],
    stops: (value, state) => (Value.Check(input, value) ? evaluate(value, state).problem : undefined),
    run: (value, { state }) => {
      const result = evaluate(value, state);
      if (!result.results) throw new OutsideDefect(result.problem);
      return { status: "accepted", text: words.simulationResult(result.results), value: result.results };
    },
    cases: simulationCases<X>(),
  });
}
