// MediaControl: a read-only media node: a tag badge, an avatar with its label, or a captioned image.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { MediaControlContract } from "./media-control.contract.ts";

export const MediaControl = defineComposition({
  id: "media-control",
  purpose: "Show a tag, an avatar or a captioned image read-only, without turning it into an action.",
  owner: { entry: "MediaControl.svelte" },
  uses: ["icon", "image", "photo-collection"], renders: ["control.tag", "control.image", "control.avatar"], approval: "none", contract: MediaControlContract,
} as const);
