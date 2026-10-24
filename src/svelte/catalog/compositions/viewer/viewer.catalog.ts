// Viewer: the full-screen media viewer with paging, zoom and playback over a list of images, audio and video.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewerContract } from "./viewer.contract.ts";

export const Viewer = defineComposition({
  id: "viewer",
  purpose: "Show images, audio and video full screen with paging, zoom and playback controls.",
  owner: { entry: "Viewer.svelte" },
  uses: ["image", "playback-canvas", "toolbar-layout"], approval: "none", contract: ViewerContract,
} as const);
