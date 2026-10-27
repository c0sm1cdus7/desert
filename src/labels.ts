import { Type } from "@sinclair/typebox";

export const labelLimits = Object.freeze({ maxItems: 12, maxLength: 64 });
export type LabelConstraints = Readonly<{ maxItems: number; maxLength: number }>;
export type LabelValues = readonly string[];
/** No leading or trailing whitespace; Postgres reads the same pattern (src/storage/render-checks.ts). */
export const canonicalLabel = "^\\S(?:[\\s\\S]*\\S)?(?![\\s\\S])";

export function labelsValueSchema(limits: LabelConstraints = labelLimits) {
  return Type.Array(Type.String({ minLength: 1, maxLength: limits.maxLength, pattern: canonicalLabel }), {
    maxItems: limits.maxItems, uniqueItems: true,
  });
}

export const LabelsValueSchema = labelsValueSchema();

/** Interaction commits may trim; canonical command validation never rewrites values. */
export function addedLabel(value: string): string { return value.trim(); }
