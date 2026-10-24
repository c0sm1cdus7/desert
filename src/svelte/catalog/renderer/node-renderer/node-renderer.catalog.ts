// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { NodeRendererContract } from "./node-renderer.contract.ts";

export const NodeRenderer = defineComposition({
  id: "node-renderer",
  purpose: "Mount the piece for a resolved node kind and translate its callbacks into node events.",
  owner: { entry: "NodeRenderer.svelte" },
  uses: ["action", "availability", "catalog-card", "catalog-detail", "catalog-home", "collection", "context-panel", "date-control", "drawer", "facts", "field", "fields", "file-control", "labels-control", "media-control", "money-control", "options-control", "popover-control", "problem", "review", "select-control"], dispatch: "resolved-node", approval: "none", contract: NodeRendererContract,
} as const);
