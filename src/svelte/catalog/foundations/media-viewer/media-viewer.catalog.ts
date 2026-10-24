// MediaViewer: the full-screen viewer of a set of images, audio and video, with paging (keys, swipe, buttons,
// thumbnails), zoom for images and the media player's controls. It absorbs the viewer, zoom-controls and
// toolbar-media-controls compositions.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { MediaViewerContract } from "./media-viewer.contract.ts";

export const MediaViewer = defineFoundation({
  id: "media-viewer",
  purpose: "Show images, audio and video full screen with paging, zoom and playback, and return focus to what opened them.",
  // F1-merge: the vendor dialog belongs to modal (F1d); the viewer then mounts Modal and stops importing it.
  owner: { entry: "MediaViewer.svelte", parts: ["MediaStrip.svelte"], mechanisms: ["media-gestures"] },
  shape: "none", states: ["image", "playable", "single"],
  approval: "required", contract: MediaViewerContract,
} as const);
