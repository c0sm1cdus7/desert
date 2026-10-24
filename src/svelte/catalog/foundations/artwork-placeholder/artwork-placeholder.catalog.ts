// ArtworkPlaceholder: the glyph that stands in for missing media artwork, a note for audio and a film strip for video.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ArtworkPlaceholderContract } from "./artwork-placeholder.contract.ts";

export const ArtworkPlaceholder = defineFoundation({
  id: "artwork-placeholder",
  purpose: "Stand in for the missing cover artwork of audio or poster of video with the glyph of its media kind.",
  owner: { entry: "ArtworkPlaceholder.svelte" },
  shape: "none", states: ["default"],
  variants: { kind: ["video", "audio"] },
  approval: "required", contract: ArtworkPlaceholderContract,
} as const);
