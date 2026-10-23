// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { NodeRendererContract } from "./node-renderer.contract.ts";

export const NodeRenderer = defineComposition({
  id: "node-renderer",
  purpose: "Declared as found at the start of the migration: NodeRenderer.svelte.",
  owner: { entry: "NodeRenderer.svelte" },
  uses: [], approval: "none", contract: NodeRendererContract,
} as const);
