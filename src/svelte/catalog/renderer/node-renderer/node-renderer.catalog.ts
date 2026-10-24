// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { NodeRendererContract } from "./node-renderer.contract.ts";

export const NodeRenderer = defineComposition({
  id: "node-renderer",
  purpose: "Declared as found at the start of the migration: NodeRenderer.svelte.",
  owner: { entry: "NodeRenderer.svelte" },
  uses: ["action", "availability", "catalog-card", "catalog-detail", "catalog-home", "collection", "context-panel", "date-control", "drawer", "facts", "fields", "file-control", "labels-control", "media-control", "money-control", "options-control", "popover-control", "problem", "review", "select-control", "text-input"], dispatch: "resolved-node", approval: "none", contract: NodeRendererContract,
} as const);
