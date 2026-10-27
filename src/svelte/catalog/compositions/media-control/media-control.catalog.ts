// MediaControl: a read-only media node: a tag, an avatar with its label, or a captioned image.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { MediaControlContract } from "./media-control.contract.ts";

export const MediaControl = defineComposition({
  id: "media-control",
  purpose: { key: "mediaControl.purpose" },
  messages: ["mediaControl.purpose", "mediaControl.unavailable"],
  owner: { entry: "MediaControl.svelte" },
  uses: ["avatar", "column", "gallery", "inline", "status", "tag", "text"], renders: ["control.tag", "control.image", "control.avatar"],
  approval: "none", contract: MediaControlContract,
} as const);
