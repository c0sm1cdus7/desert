// ToolbarMediaControls: transport, thumbnails and volume of the selected media in a toolbar.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ToolbarMediaControlsContract } from "./toolbar-media-controls.contract.ts";

export const ToolbarMediaControls = defineComposition({
  id: "toolbar-media-controls",
  purpose: "Show transport, media thumbnails and volume for the media selected in a toolbar.",
  owner: { entry: "ToolbarMediaControls.svelte" },
  uses: ["artwork-placeholder", "image", "playback-controls"], approval: "none", contract: ToolbarMediaControlsContract,
} as const);
