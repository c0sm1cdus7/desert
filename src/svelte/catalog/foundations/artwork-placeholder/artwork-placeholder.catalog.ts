// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ArtworkPlaceholderContract } from "./artwork-placeholder.contract.ts";

export const ArtworkPlaceholder = defineFoundation({
  id: "artwork-placeholder",
  purpose: "Declared as found at the start of the migration: ArtworkPlaceholder.svelte.",
  owner: { entry: "ArtworkPlaceholder.svelte" },
  shape: "none", states: ["default"], approval: "required", contract: ArtworkPlaceholderContract,
} as const);
