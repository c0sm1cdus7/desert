// MediaReferenceSelector: the cover chooser of a labels control that references media: a field well showing the chosen
// cover, and a popover of cover cards plus the automatic cover.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { MediaReferenceSelectorContract } from "./media-reference-selector.contract.ts";

export const MediaReferenceSelector = defineComposition({
  id: "media-reference-selector",
  purpose: { key: "mediaReferenceSelector.purpose" },
  messages: ["mediaReferenceSelector.purpose", "mediaReferenceSelector.selected", "mediaReferenceSelector.unavailable",
    "mediaReferenceSelector.automatic", "mediaReferenceSelector.loading", "mediaReferenceSelector.cover", "mediaReferenceSelector.automaticCover"],
  owner: { entry: "MediaReferenceSelector.svelte" },
  uses: ["action", "choice", "collection-state", "column", "popover", "stack-layout", "text"], approval: "none", contract: MediaReferenceSelectorContract,
} as const);
