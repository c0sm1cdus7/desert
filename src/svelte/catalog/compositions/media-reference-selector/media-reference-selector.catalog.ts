// MediaReferenceSelector: the cover chooser of a labels control that references media: one selected image or automatic.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { MediaReferenceSelectorContract } from "./media-reference-selector.contract.ts";

export const MediaReferenceSelector = defineComposition({
  id: "media-reference-selector",
  purpose: "Select media references from a shared field without introducing another media library or creation path.",
  owner: { entry: "MediaReferenceSelector.svelte" },
  uses: ["collection-state", "image", "stack-layout"], approval: "none", contract: MediaReferenceSelectorContract,
} as const);
