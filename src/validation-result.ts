import type { ErrorObject } from "ajv";
import { freezeDeep, jsonSnapshot } from "./json.ts";

export type ValidationIssue = {
  readonly keyword: string;
  readonly instancePath: string;
  readonly schemaPath?: string;
  readonly params?: Readonly<Record<string, unknown>>;
};
export type ValidationResult = { readonly valid: boolean; readonly issues: readonly ValidationIssue[] };
type Validator = { (value: unknown): boolean; errors?: readonly ErrorObject[] | null };

/** Snapshot validator diagnostics before its next call; never derive another set of constraints. */
export function inspectValidation(validate: Validator, value: unknown): ValidationResult {
  let input;
  try { input = jsonSnapshot(value); }
  catch { return freezeDeep({ valid: false, issues: [{ keyword: "json_value", instancePath: "" }] }); }
  const valid = validate(input);
  const issues = (validate.errors ?? []).map(error => ({ keyword: error.keyword,
    instancePath: error.instancePath, schemaPath: error.schemaPath, params: structuredClone(error.params) }));
  return freezeDeep({ valid, issues });
}
