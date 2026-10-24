// Where a stack places the node it holds. Framed content (tag, avatar, image, card, availability) already has its own
// reading inset and sits at the content inset; every other node reads at the surface inset. The placements themselves
// are StackItem's contract (`placement`); this table only picks one per node kind.
import type { ResolvedNodeId } from "../../interaction/catalog.ts";

const contentKinds: ReadonlySet<ResolvedNodeId> = new Set<ResolvedNodeId>(
  ["control.tag", "control.avatar", "control.image", "catalog.card", "availability"]);

/** The placement of a stack entry holding a node of `kind`. */
export function stackPlacement(kind: ResolvedNodeId) {
  return contentKinds.has(kind) ? "content" as const : "surface" as const;
}
