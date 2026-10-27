import type { HumanSurface, Mutation, ValidateInput } from "../types.ts";
import type { ValidationResult } from "../../validation-result.ts";
import { isImageFileSelection, requireImageSelection,assetInputMedia } from "../../interaction/image-input.ts";
import type { Draft } from "../../interaction/draft.ts";

export function inspectMutationDraft(surface: HumanSurface, journey: Mutation, draft: Readonly<Draft>, validate: ValidateInput): ValidationResult {
  const pending = new Set(journey.inputFields.filter(field => surface.fieldKinds?.[`${journey.object}.${field}`] === "file"
    && isImageFileSelection(draft[field])));
  if (!pending.size) return validate.inspect?.(journey.commandId, draft) ?? { valid: validate(journey.commandId, draft), issues: [] };
  if (!validate.inspect) return { valid: false, issues: [{ keyword: "draft_validation_unavailable", instancePath: "" }] };
  const input = Object.fromEntries(Object.entries(draft).filter(([field]) => !pending.has(field)));
  const checked = validate.inspect(journey.commandId, input);
  const issues = checked.issues.filter(issue => !(issue.keyword === "required" && issue.instancePath === ""
    && typeof issue.params?.missingProperty === "string" && pending.has(issue.params.missingProperty)));
  for (const field of pending) {
    try { const value = draft[field]; if (!isImageFileSelection(value)) throw new Error("INVALID_IMAGE_SELECTION"); requireImageSelection(value,assetInputMedia(journey.inputSchema.properties[field])); }
    catch { issues.push({ keyword: "image_selection", instancePath: `/${field.replaceAll("~", "~0").replaceAll("/", "~1")}` }); }
  }
  return { valid: issues.length === 0, issues };
}
