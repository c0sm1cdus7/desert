// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PhotoCollectionContract } from "./photo-collection.contract.ts";

export const PhotoCollection = defineComposition({
  id: "photo-collection",
  purpose: "Declared as found at the start of the migration: PhotoCollection.svelte.",
  owner: { entry: "PhotoCollection.svelte" },
  uses: ["image", "viewer"], approval: "none", contract: PhotoCollectionContract,
} as const);
