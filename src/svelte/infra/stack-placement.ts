// Where a stack places the node it holds. Framed content (tag, avatar, image, card, availability) already has its own
// reading inset and sits at the content inset; every other node reads at the surface inset. StackItem takes the result.
import { Type, type Static } from "@sinclair/typebox";
import type { ResolvedNodeId } from "../../interaction/catalog.ts";

export const StackPlacementSchema = Type.Union([Type.Literal("content"), Type.Literal("surface")]);
export type StackPlacement = Static<typeof StackPlacementSchema>;

const contentKinds: ReadonlySet<ResolvedNodeId> = new Set<ResolvedNodeId>(
  ["control.tag", "control.avatar", "control.image", "catalog.card", "availability"]);

/** The placement of a stack entry holding a node of `kind`. */
export function stackPlacement(kind: ResolvedNodeId): StackPlacement {
  return contentKinds.has(kind) ? "content" : "surface";
}
