import { Type, type Static } from "@sinclair/typebox";
import { jsonSnapshot, type Frozen } from "./json.ts";
import { createSchemaValidator } from "./validation.ts";

/** Execution metadata is separate from the command's authored business input. */
export const PrepareOptionsSchema = Type.Object({
  expectedVersion: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }),
}, { additionalProperties: false });
export type PrepareOptions = Frozen<Static<typeof PrepareOptionsSchema>>;
const validate = createSchemaValidator(PrepareOptionsSchema);

export function snapshotPrepareOptions(input: unknown): PrepareOptions {
  try {
    const snapshot = jsonSnapshot(input);
    if (!validate(snapshot)) throw new Error("Invalid options");
    return snapshot as PrepareOptions;
  } catch { throw new Error("INVALID_EDIT_BASE"); }
}
