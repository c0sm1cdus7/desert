// The finite colors a referenced object may carry (a project's color): the one list every reader of a reference color
// names. The color bullet paints each, and a reference capability admits only these.
import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

export const ReferenceColorSchema = Type.Union([Type.Literal("blue"), Type.Literal("violet"), Type.Literal("rose"),
  Type.Literal("green"), Type.Literal("amber"), Type.Literal("slate")]);
export type ReferenceColor = Static<typeof ReferenceColorSchema>;

/** A stored fact read as a reference color; any other value is an invalid reference (a reference capability admits only these). */
export function referenceColor(value: unknown): ReferenceColor {
  if (Value.Check(ReferenceColorSchema, value)) return value;
  throw new Error("INVALID_REFERENCE_COLOR");
}
