import type { ValidationIssue, ValidationResult } from "../../validation-result.ts";
import { rendererLocale } from "../../messages/renderer-locale.ts";
import { Messages, m } from "../../messages/keys.ts";

// Every sentence this module shows a person is a key of the `fieldFeedback` namespace it owns (plan §14).
const bundle = Messages.bundle(rendererLocale);

function message(issue: ValidationIssue): string {
  const limit = issue.params?.limit;
  if (issue.keyword === "required" || (issue.keyword === "minLength" && limit === 1)) return bundle.text(m.fieldFeedback.required);
  if (issue.keyword === "minLength" && typeof limit === "number") return bundle.text(m.fieldFeedback.atLeast, { limit: String(limit) });
  if (issue.keyword === "maxLength" && typeof limit === "number") return bundle.text(limit === 1 ? m.fieldFeedback.atMostCharacter : m.fieldFeedback.atMostCharacters, { limit: String(limit) });
  if (issue.keyword === "maxItems" && typeof limit === "number") return bundle.text(m.fieldFeedback.atMostLabels, { limit: String(limit) });
  if (issue.keyword === "uniqueItems") return bundle.text(m.fieldFeedback.repeatedLabel);
  return bundle.text(m.fieldFeedback.check);
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
