// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ControlRendererContract } from "./control-renderer.contract.ts";

export const ControlRenderer = defineComposition({
  id: "control-renderer",
  purpose: "Declared as found at the start of the migration: ControlRenderer.svelte.",
  owner: { entry: "ControlRenderer.svelte" },
  uses: ["node-renderer"], approval: "none", contract: ControlRendererContract,
} as const);
