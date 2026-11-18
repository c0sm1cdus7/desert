// Simula casos explícitos sin ejecutar acciones ni escribir cambios de vigencia.
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { object } from "../../fields/visible-text.ts";
import { evaluatePredicate, ruleProblem } from "../../house/rules/rule-predicate.ts";
import { ruleReference } from "../../house/rules/rule-facts.ts";
import { rulesTexts as words, ruleFormTexts as form } from "../../texts/rules.texts.ts";
import { programAct } from "../promises.ts";
import type { Program, State, ToolRegistry } from "../tool-contract.ts";
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
  samples: Type.String({ title: form.samples, placeholder: form.sample, plain: true, minLength: 1, maxLength: 32000 }),
});
function simulation<X extends Program>(value: unknown, state: State<X>, registry: ToolRegistry<X>) {
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
  if (!Value.Check(sampleSchema, samples) || samples.some(sample => !Value.Check(schema, sample.input)))
    return { problem: form.casesInvalid };
  return {
    results: samples.map(sample => ({
      actor: sample.actor,
      outcome: evaluatePredicate(definition.condition, {
        ...sample,
        admin: state.house.admin,
        inJourney: sample.inJourney ?? false,
      })
        ? definition.effect
        : "passed",
    })),
  };
}
export function ruleSimulation<X extends Program>(registry: ToolRegistry<X>) {
  return programAct<X, typeof input>({
    ...words.simulate,
    input: ruleForm(input),
    on: "tool",
    undoable: true,
    output: true,
    refuses: [form.casesInvalid, words.missing, words.action, words.invalid, words.field, words.type],
    stops: (value, state) => (Value.Check(input, value) ? simulation(value, state, registry).problem : undefined),
    run: (value, { state }) => {
      const result = simulation(value, state, registry);
      if (!result.results) throw new Error("Simulation was not validated");
      return { status: "accepted", text: JSON.stringify(result.results), value: result.results };
    },
    cases: [
      { promise: words.missing, input: { id: "absent", version: 1, samples: "[]" }, then: { refused: words.missing } },
    ],
  });
}
