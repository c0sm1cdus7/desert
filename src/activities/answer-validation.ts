import type { ValidationResult } from "../validation-result.ts";

export function activityAnswerValidation(validation: ValidationResult, inputs: readonly string[]): ValidationResult {
  const issues = validation.issues.filter(issue => !(issue.keyword === "required" && issue.instancePath === ""
    && typeof issue.params?.missingProperty === "string" && !inputs.includes(issue.params.missingProperty)));
  return { valid: validation.valid || (validation.issues.length > 0 && issues.length === 0), issues };
}
