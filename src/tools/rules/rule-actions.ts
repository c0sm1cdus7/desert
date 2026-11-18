// Define escrituras y consultas de reglas con autoridad actual y validación contra acciones instaladas.
import { type TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { object } from "../../fields/visible-text.ts";
import { effect } from "../../house/facts.ts";
import { ruleDefinition } from "../../house/rules/rule-schema.ts";
import { ruleReference } from "../../house/rules/rule-facts.ts";
import { ruleProblem } from "../../house/rules/rule-predicate.ts";
import { rulesTexts as words } from "../../texts/rules.texts.ts";
import { programAct } from "../promises.ts";
import type { Program, State, ToolRegistry } from "../tool-contract.ts";
import { coreRuleSchema } from "./rule-core-actions.ts";
import { ruleForm } from "./rule-form.ts";
export function actionSchema<X extends Program>(registry: ToolRegistry<X>, tool: string, act: string) {
  return coreRuleSchema(tool, act) ?? registry.find(item => item.id === tool)?.acts[act]?.input;
}
export function versionProblem<X extends Program>(
  input: unknown,
  state: State<X>,
  registry: ToolRegistry<X>,
  operation: "approve" | "retire",
): string | undefined {
  if (!Value.Check(ruleReference, input)) return words.invalid;
  const version = state.house.rules.versions.get(input.id)?.find(each => each.version === input.version);
  if (!version) return words.missing;
  if (operation === "retire")
    return state.house.rules.active.get(input.id) === input.version ? undefined : words.inactive;
  if (state.house.rules.approved.get(input.id)?.includes(input.version)) return words.approved;
  return ruleProblem(
    version.definition,
    actionSchema(registry, version.definition.action.tool, version.definition.action.act),
  );
}
const causes = [words.invalid, words.action, words.field, words.type, words.missing, words.approved, words.inactive];
function writeRule<X extends Program>(registry: ToolRegistry<X>, operation: "propose" | "save") {
  return programAct<X, typeof ruleDefinition>({
    ...words[operation],
    input: ruleForm(ruleDefinition),
    on: "tool",
    undoable: true,
    refuses: [words.only, ...causes],
    offered: ({ by, house }) => (operation === "save" && by !== house.admin ? words.only : undefined),
    stops: value =>
      Value.Check(ruleDefinition, value)
        ? ruleProblem(value, actionSchema(registry, value.action.tool, value.action.act))
        : undefined,
    run: (definition, { by, state }) => {
      const previous = state.house.rules.versions.get(definition.id)?.at(-1)?.version ?? null;
      return {
        status: "accepted",
        text: by === state.house.admin ? words.saved : words.draft,
        effects: [effect("rule-versioned", { definition, previous, version: (previous ?? 0) + 1 }, by)],
      };
    },
    cases: [
      {
        promise: words.action,
        input: {
          id: "example",
          text: words.example,
          action: { tool: "absent", act: "absent" },
          condition: { operator: "actor", kind: "identity" },
          effect: "frena",
        },
        then: { refused: words.action },
      },
    ],
  });
}
function changeRule<X extends Program>(registry: ToolRegistry<X>, operation: "approve" | "retire") {
  return programAct<X, typeof ruleReference>({
    ...words[operation],
    input: ruleForm(ruleReference),
    on: "tool",
    undoable: true,
    refuses: [words.only, ...causes],
    offered: ({ by, house }) => (by !== house.admin ? words.only : undefined),
    stops: (value, state) =>
      Value.Check(ruleReference, value) ? versionProblem(value, state, registry, operation) : undefined,
    run: (input, { by }) => ({
      status: "accepted",
      text: operation === "approve" ? words.activated : words.retired,
      effects: [effect(operation === "approve" ? "rule-approved" : "rule-retired", input, by)],
    }),
    cases: [{ promise: words.missing, input: { id: "absent", version: 1 }, then: { refused: words.missing } }],
  });
}
export function ruleWriteActions<X extends Program>(registry: ToolRegistry<X>) {
  return {
    propose: writeRule(registry, "propose"),
    save: writeRule(registry, "save"),
    approve: changeRule(registry, "approve"),
    retire: changeRule(registry, "retire"),
  };
}
export function ruleConsult<X extends Program>() {
  return programAct<X, TSchema>({
    ...words.consult,
    input: object({}),
    on: "tool",
    undoable: true,
    output: true,
    run: (_, { state }) => ({
      status: "accepted",
      text: ruleReading(state),
      value: [...state.house.rules.versions].map(([id, versions]) => ({
        id,
        versions,
        active: state.house.rules.active.get(id) ?? null,
      })),
    }),
    cases: [{ promise: words.empty, input: {}, then: { says: words.empty, facts: [] } }],
  });
}
export function ruleReading<X extends Program>(state: State<X>): string {
  const rules = state.house.rules;
  return rules.versions.size
    ? JSON.stringify(
        [...rules.versions].map(([id, versions]) => ({
          id,
          active: rules.active.get(id) ?? null,
          approved: rules.approved.get(id) ?? [],
          retired: rules.retired.get(id) ?? [],
          versions,
        })),
      )
    : words.empty;
}
