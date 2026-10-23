import type { FieldDefinition, ObjectDefinition, ProductDefinition } from "../contracts.ts";
import type { CommandDefinition } from "../program-grammar.ts";
import { VerificationGap, type Facts } from "./types.ts";
import { createSchemaValidator } from "../validation.ts";
import { labelsValueSchema } from "../labels.ts";
import type { FactValue } from "../fact-values.ts";

const maximumText = 1024;
export function accepts(field: FieldDefinition, value: unknown): value is FactValue {
  switch (field.kind) {
    case "text": return typeof value === "string" && [...value].length >= (field.minLength ?? 0)
      && [...value].length <= (field.maxLength ?? Infinity);
    case "integer": return typeof value === "number" && Number.isSafeInteger(value)
      && value >= (field.minimum ?? Number.MIN_SAFE_INTEGER) && value <= (field.maximum ?? Number.MAX_SAFE_INTEGER);
    case "enum": return typeof value === "string" && field.values.includes(value);
    case "principal": return typeof value === "string";
    case "asset": return false;
    case "labels": return createSchemaValidator(labelsValueSchema(field))(value);
  }
}

export function fieldValues(field: FieldDefinition, seed: number): FactValue[] {
  switch (field.kind) {
    case "text": {
      const min = field.minLength ?? 0;
      const max = field.maxLength ?? Math.max(2, min + 1);
      if (max > maximumText) throw new VerificationGap("TEXT_GENERATION_LIMIT: 1024 code points");
      const symbol = String.fromCharCode(65 + Math.abs(seed % 26));
      return [...new Set([min, Math.min(max, Math.max(1, min)), max])]
        .map(length => symbol.repeat(length));
    }
    case "integer": return [...new Set([field.minimum ?? 0, field.maximum ?? 1, 0, 1, -1])]
      .filter(value => accepts(field, value));
    case "enum": return [...field.values];
    case "principal": throw new VerificationGap("PRINCIPAL_IS_NOT_GENERATED_INPUT");
    case "asset": throw new VerificationGap("ASSET_INPUT_REQUIRES_STAGED_FIXTURE");
    case "labels": return [[], ["A"], Array.from({ length: field.maxItems }, (_, index) =>
      String.fromCharCode(65 + index).repeat(field.maxLength))];
  }
}

export function commandInputs(product: ProductDefinition, command: CommandDefinition, seed: number) {
  const object = product.objects.find(object => object.id === command.object)!;
  let inputs: Facts[] = [{}];
  for (const key of command.input) {
    const field = object.facts[key]!;
    const guards = (product.journeys ?? []).flatMap(journey =>
      journey.kind === "mutation" && journey.command.kind === "update" && journey.command.object === object.id
        ? Object.values(journey.command.when) : []);
    const candidates = [...new Set([...fieldValues(field, seed), ...guards.filter(value => accepts(field, value))])];
    if (inputs.length * candidates.length > 128) throw new VerificationGap("INPUT_COMBINATION_LIMIT: 128");
    inputs = inputs.flatMap(input => candidates.map(value => ({ ...input, [key]: value })));
  }
  return inputs;
}

export function invalidInputs(object: ObjectDefinition, command: CommandDefinition, input: Facts) {
  let unknownKey = "__unexpected";
  while (command.input.includes(unknownKey)) unknownKey += "_";
  const cases: unknown[] = [null, [], { ...input, [unknownKey]: true }];
  for (const key of command.input) {
    const field = object.facts[key]!;
    const missing = { ...input };
    delete missing[key];
    cases.push(missing, { ...input, [key]: null }, { ...input, [key]: false });
    const invalid: unknown[] = [];
    if (field.kind === "text") {
      if (field.minLength) invalid.push("x".repeat(field.minLength - 1));
      if (field.maxLength !== undefined) invalid.push("x".repeat(field.maxLength + 1));
      invalid.push(1);
    } else if (field.kind === "integer") {
      invalid.push(0.5, "1");
      if (field.minimum !== undefined) invalid.push(field.minimum - 1);
      if (field.maximum !== undefined) invalid.push(field.maximum + 1);
    } else if (field.kind === "enum") {
      let unknown = "__unknown";
      while (field.values.includes(unknown)) unknown += "_";
      invalid.push(unknown, 0);
    } else if (field.kind === "labels") {
      invalid.push("A,B", [""], [" A"], ["A "], ["A", "A"], [["A"]],
        ["x".repeat(field.maxLength + 1)], Array.from({ length: field.maxItems + 1 }, (_, index) => String(index)));
    }
    cases.push(...invalid.map(value => ({ ...input, [key]: value })));
  }
  return cases;
}
