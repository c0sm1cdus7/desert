// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { CollectionContract } from "./collection.contract.ts";

export const Collection = defineComposition({
  id: "collection",
  purpose: "Browse objects with shared row geometry, or present media in a gallery.",
  owner: { entry: "Collection.svelte" },
  uses: ["attention-indicator", "collection-state", "grouped-panel", "media-collection-grid", "media-grid"], approval: "none", contract: CollectionContract,
} as const);
