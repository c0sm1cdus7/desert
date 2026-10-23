import { Type, type Static } from "@sinclair/typebox";
import { jsonSnapshot, type Frozen } from "./json.ts";
import { createSchemaValidator } from "./validation.ts";
import type { ValidationIssue } from "./validation-result.ts";

export const PreflightOptionsSchema = Type.Object({
  subject: Type.Optional(Type.String({ minLength: 1 })),
  expectedVersion: Type.Optional(Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER })),
}, { additionalProperties: false });
export type PreflightOptions = Frozen<Static<typeof PreflightOptionsSchema>>;
export type PreflightResult = {
  readonly journeyId: string;
  readonly contractDigest: string;
  readonly status: "ready" | "incomplete" | "invalid" | "blocked";
  readonly missing: readonly string[];
  readonly issues: readonly ValidationIssue[];
  readonly blockers: readonly ("EDIT_BASE_REQUIRED" | "VERSION_CONFLICT" | "PRECONDITION_FAILED")[];
};
const validate = createSchemaValidator(PreflightOptionsSchema);
export function snapshotPreflightOptions(options: unknown): PreflightOptions {
  const snapshot = jsonSnapshot(options);
  if (!validate(snapshot)) throw new Error("INVALID_PREFLIGHT_OPTIONS");
  return snapshot as PreflightOptions;
}
