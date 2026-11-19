// Declared rule examples exercise successful lifecycle changes and each reachable refusal through the router.
import type { ruleReference } from "../../house/rules/rule-facts.ts";
import type { ruleDefinition } from "../../house/rules/rule-schema.ts";
import { ruleFormTexts as form, rulesTexts as words } from "../../texts/rules.texts.ts";
import type { Case } from "../promises.ts";
import type { Program } from "../tool-contract.ts";
export const exampleRule = {
  id: "example",
  text: words.example,
  action: { tool: "rules", act: "consult" },
  condition: { operator: "actor", kind: "program" },
  effect: "frena",
} as const;
const reference = { id: "example", version: 1 };
const proposed = { act: "propose", on: "rules", by: "beto", input: exampleRule };
const saved = { act: "save", on: "rules", input: exampleRule };
export function writeRuleCases<X extends Program>(
  operation: "propose" | "save",
): readonly [Case<X, typeof ruleDefinition>, ...Case<X, typeof ruleDefinition>[]] {
  return [
    {
      promise: operation === "save" ? words.saved : words.draft,
      ...(operation === "propose" ? { by: "beto" } : {}),
      input: exampleRule,
      then: { says: operation === "save" ? words.saved : words.draft, facts: [] },
    },
    ...(operation === "propose"
      ? [
          {
            promise: words.history,
            given: [proposed],
            by: "beto",
            input: exampleRule,
            then: { says: words.draft, facts: [] },
          },
        ]
      : [{ promise: words.only, by: "beto", input: exampleRule, then: { refused: words.only } }]),
    ...invalidWrites.map(kase => ({ ...kase, ...(operation === "propose" ? { by: "beto" } : {}) })),
  ];
}
export function changeRuleCases<X extends Program>(
  operation: "approve" | "retire",
): readonly [Case<X, typeof ruleReference>, ...Case<X, typeof ruleReference>[]] {
  const approve = operation === "approve";
  const given = [approve ? proposed : saved];
  return [
    {
      promise: approve ? words.activated : words.retired,
      given,
      input: reference,
      then: { says: approve ? words.activated : words.retired, facts: [] },
    },
    { promise: words.only, given, by: "beto", input: reference, then: { refused: words.only } },
    { promise: words.missing, input: reference, then: { refused: words.missing } },
    {
      promise: approve ? words.approved : words.inactive,
      given: [approve ? saved : proposed],
      input: reference,
      then: { refused: approve ? words.approved : words.inactive },
    },
  ];
}
type SimulationCase<X extends Program> = Case<X> & { input: { id: string; version: number; samples: string } };
export function simulationCases<X extends Program>(): readonly [SimulationCase<X>, ...SimulationCase<X>[]] {
  const input = { ...reference, samples: JSON.stringify([{ actor: "ana", input: {}, now: 0 }]) };
  return [
    {
      promise: words.simulate.name,
      given: [proposed],
      input,
      then: { says: words.simulationResult([{ actor: "ana", outcome: "passed" }]), facts: [] },
    },
    { promise: words.missing, input, then: { refused: words.missing } },
    {
      promise: form.casesInvalid,
      given: [proposed],
      input: { ...input, samples: "[]" },
      then: { refused: form.casesInvalid },
    },
    {
      promise: form.unavailable,
      given: [{ ...proposed, input: { ...exampleRule, action: { tool: "me", act: "attend" } } }],
      input,
      then: { refused: form.unavailable },
    },
  ];
}

const invalidWrites = [
  {
    promise: words.action,
    input: { ...exampleRule, action: { tool: "absent", act: "absent" } },
    then: { refused: words.action },
  },
  {
    promise: words.invalid,
    input: {
      ...exampleRule,
      condition: {
        operator: "schedule",
        from: 0,
        until: 0,
        offsetMinutes: 0,
        days: [0],
      },
    },
    then: { refused: words.invalid },
  },
  {
    promise: words.field,
    input: {
      ...exampleRule,
      condition: {
        operator: "gt",
        field: { source: "input", path: "absent" },
        value: 0,
      },
    },
    then: { refused: words.field },
  },
  {
    promise: words.type,
    input: {
      ...exampleRule,
      condition: {
        operator: "gt",
        field: { source: "core", path: "admin" },
        value: 0,
      },
    },
    then: { refused: words.type },
  },
] satisfies readonly Case<Program, typeof ruleDefinition>[];
