import type { ErrorObject } from "ajv";
import { freezeDeep, jsonSnapshot, type Json } from "./json.ts";

export type ValidationIssue = {
  readonly keyword: string;
  readonly instancePath: string;
  readonly schemaPath?: string;
  readonly params?: Readonly<Record<string, Json>>;
};
export type ValidationResult = { readonly valid: boolean; readonly issues: readonly ValidationIssue[] };
type Validator = { (value: unknown): boolean; errors?: readonly ErrorObject[] | null };

const isJsonRecord = (value: Json): value is Readonly<Record<string, Json>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A validator's keyword parameters as a JSON record; anything else is a validator this module does not understand. */
function issueParams(params: ErrorObject["params"]): Readonly<Record<string, Json>> {
  const snapshot = jsonSnapshot(params);
  if (!isJsonRecord(snapshot)) throw new Error("INVALID_VALIDATION_PARAMS: validator parameters are not a JSON record");
  return snapshot;
}

/** Snapshot validator diagnostics before its next call; never derive another set of constraints. */
export function inspectValidation(validate: Validator, value: unknown): ValidationResult {
  let input;
  try { input = jsonSnapshot(value); }
  catch { return freezeDeep({ valid: false, issues: [{ keyword: "json_value", instancePath: "" }] }); }
  const valid = validate(input);
  const issues = (validate.errors ?? []).map(error => ({ keyword: error.keyword,
    instancePath: error.instancePath, schemaPath: error.schemaPath, params: issueParams(error.params) }));
  // Frozen in place: JSON parameters make Frozen<ValidationResult> unbounded, and the declared type is already readonly.
  const result: ValidationResult = { valid, issues };
  freezeDeep(result);
  return result;
}
