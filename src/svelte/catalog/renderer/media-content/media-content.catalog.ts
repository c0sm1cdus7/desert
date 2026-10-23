// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { MediaContentContract } from "./media-content.contract.ts";

export const MediaContent = defineComposition({
  id: "media-content",
  purpose: "Declared as found at the start of the migration: MediaContent.svelte.",
  owner: { entry: "MediaContent.svelte" },
  uses: [], approval: "none", contract: MediaContentContract,
} as const);
