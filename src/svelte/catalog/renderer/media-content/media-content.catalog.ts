// MediaContent: the view-content entry for a media library; it forwards record selection to the library it mounts.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { MediaContentContract } from "./media-content.contract.ts";

export const MediaContent = defineComposition({
  id: "media-content",
  purpose: { key: "mediaContent.purpose" },
  messages: ["mediaContent.purpose"],
  owner: { entry: "MediaContent.svelte" },
  uses: ["library"], approval: "none", contract: MediaContentContract,
} as const);
