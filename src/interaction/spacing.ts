import { Type, type Static } from "@sinclair/typebox";

/** The named steps of the spacing scale a layout piece separates its children by. The theme writes each step's length
 * once (`--spacing-<step>`); Column also offers the same steps as its `gap` variant axis, and a test proves both match.
 * `tight` is the gap between a title and its own copy (a dialog's title and subtitle). */
export const GapSchema = Type.Union([
  Type.Literal("tight"), Type.Literal("snug"), Type.Literal("cozy"), Type.Literal("close"), Type.Literal("near"), Type.Literal("regular"), Type.Literal("loose"), Type.Literal("airy"), Type.Literal("relaxed"), Type.Literal("ample"), Type.Literal("section"),
]);
export type Gap = Static<typeof GapSchema>;
