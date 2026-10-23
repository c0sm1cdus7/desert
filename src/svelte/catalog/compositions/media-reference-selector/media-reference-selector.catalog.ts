// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { MediaReferenceSelectorContract } from "./media-reference-selector.contract.ts";

export const MediaReferenceSelector = defineComposition({
  id: "media-reference-selector",
  purpose: "Select media references from a shared field without introducing another media library or creation path.",
  owner: { entry: "MediaReferenceSelector.svelte" },
  uses: ["collection-state", "image", "stack-layout"], approval: "none", contract: MediaReferenceSelectorContract,
} as const);
