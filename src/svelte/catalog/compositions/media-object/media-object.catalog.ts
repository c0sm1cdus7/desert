// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { MediaObjectContract } from "./media-object.contract.ts";

export const MediaObject = defineComposition({
  id: "media-object",
  purpose: "Declared as found at the start of the migration: MediaObject.svelte.",
  owner: { entry: "MediaObject.svelte" },
  uses: ["photo-collection", "playback-canvas", "toolbar-layout"], approval: "none", contract: MediaObjectContract,
} as const);
