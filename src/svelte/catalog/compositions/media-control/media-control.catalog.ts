// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { MediaControlContract } from "./media-control.contract.ts";

export const MediaControl = defineComposition({
  id: "media-control",
  purpose: "Read a short semantic label without turning it into an action.",
  owner: { entry: "MediaControl.svelte" },
  uses: ["image", "photo-collection"], approval: "none", contract: MediaControlContract,
} as const);
