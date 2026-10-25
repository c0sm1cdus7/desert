import { Type, type Static } from "@sinclair/typebox";

/** The named steps of the spacing scale a layout piece separates its children by. The theme writes each step's length
 * once (`--spacing-<step>`); Column also offers the same steps as its `gap` variant axis, and a test proves both match. */
export const GapSchema = Type.Union([
  Type.Literal("snug"), Type.Literal("close"), Type.Literal("regular"), Type.Literal("loose"), Type.Literal("relaxed"), Type.Literal("section"),
]);
export type Gap = Static<typeof GapSchema>;
