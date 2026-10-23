import type { ValidationIssue, ValidationResult } from "../../validation-result.ts";

function message(issue: ValidationIssue): string {
  const limit = issue.params?.limit;
  if (issue.keyword === "required" || (issue.keyword === "minLength" && limit === 1)) return "Enter a value.";
  if (issue.keyword === "minLength" && typeof limit === "number") return `Enter at least ${limit} characters.`;
  if (issue.keyword === "maxLength" && typeof limit === "number") return `Use no more than ${limit} ${limit === 1 ? "character" : "characters"}.`;
  if (issue.keyword === "maxItems" && typeof limit === "number") return `Use no more than ${limit} labels.`;
  if (issue.keyword === "uniqueItems") return "Remove the repeated label.";
  return "Check this value.";
}

/** Presentation only: paths and keyword parameters are supplied by canonical validation. */
export function fieldFeedback(result: ValidationResult, touched: readonly string[], labelFields: readonly string[] = []): Readonly<Record<string, string>> {
  if (result.valid) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.issues) {
    const path = issue.instancePath.split("/");
    const field = path[1]?.replace(/~1/g, "/").replace(/~0/g, "~");
    const labelItem = path.length === 3 && field !== undefined && labelFields.includes(field) && /^(0|[1-9][0-9]*)$/.test(path[2]!);
    const name = issue.keyword === "required" && issue.instancePath === "" ? issue.params?.missingProperty
      : path.length === 2 || labelItem ? field : undefined;
    if (typeof name === "string" && touched.includes(name) && !Object.hasOwn(errors, name)) {
      Object.defineProperty(errors, name, { value: message(issue), enumerable: true });
    }
  }
  return errors;
}
