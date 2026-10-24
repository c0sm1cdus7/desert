// What a trigger says about the surface it opens, as pure data (design §3.1). Popover, Menu and Shell pass it to an
// Action or a Field trigger, then anchor their surface to `#${id}` and return focus there; no handler crosses a contract.
import { Type, type Static } from "@sinclair/typebox";

export const DisclosureSchema = Type.Object({
  /** The trigger's DOM id; the overlay anchors to `#${id}` and returns focus to it. */
  id: Type.String(),
  /** The id of the surface it opens (aria-controls, rendered only while expanded). */
  controls: Type.String(),
  /** aria-expanded, and data-state open|closed. */
  expanded: Type.Boolean(),
  haspopup: Type.Union([Type.Literal("dialog"), Type.Literal("menu"), Type.Literal("listbox")]),
}, { additionalProperties: false });
export type Disclosure = Static<typeof DisclosureSchema>;
