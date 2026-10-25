// MediaObject: the media fact of an object's context, played when it is audio or video, shown when it is an image,
// with its description as a caption.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { MediaObjectContract } from "./media-object.contract.ts";

export const MediaObject = defineComposition({
  id: "media-object",
  purpose: { key: "mediaObject.purpose" },
  messages: ["mediaObject.purpose", "mediaObject.image", "mediaObject.unavailable"],
  owner: { entry: "MediaObject.svelte" },
  uses: ["column", "gallery", "image", "media-player", "text"], approval: "none", contract: MediaObjectContract,
} as const);
