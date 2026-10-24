// Viewer: the full-screen media viewer with paging, zoom and playback. Its contract stays a stub: `items` are
// ViewerMedia, a type that lives in src/svelte/infra (visual code), so no contract may reference it.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewerContract } from "./viewer.contract.ts";

export const Viewer = defineComposition({
  id: "viewer",
  purpose: "Show images, audio and video full screen with paging, zoom and playback controls.",
  owner: { entry: "Viewer.svelte" },
  uses: ["image", "playback-canvas", "toolbar-layout"], approval: "none", contract: ViewerContract,
} as const);
