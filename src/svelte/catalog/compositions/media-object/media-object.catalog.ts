// MediaObject: the media fact of an object's context, played when it is audio or video, shown when it is an image,
// with its description as a caption.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { MediaObjectContract } from "./media-object.contract.ts";

export const MediaObject = defineComposition({
  id: "media-object",
  purpose: "Show the media fact of an object's context: playable audio or video, an image, or a placeholder when unavailable.",
  owner: { entry: "MediaObject.svelte" },
  uses: ["photo-collection", "playback-canvas", "toolbar-layout"], approval: "none", contract: MediaObjectContract,
} as const);
