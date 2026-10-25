// MediaViewer: the full-screen viewer of a set of images, audio and video, with paging (keys, swipe, buttons,
// thumbnails), zoom for images and the media player's controls. It absorbs the viewer, zoom-controls and
// toolbar-media-controls compositions.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { MediaViewerContract } from "./media-viewer.contract.ts";

export const MediaViewer = defineFoundation({
  id: "media-viewer",
  purpose: "Show images, audio and video full screen with paging, zoom and playback, and return focus to what opened them.",
  messages: ["mediaViewer.close", "mediaViewer.zoomOut", "mediaViewer.resetZoom", "mediaViewer.zoomIn", "mediaViewer.media", "mediaViewer.previous", "mediaViewer.next", "mediaViewer.instructions"],
  owner: { entry: "MediaViewer.svelte", parts: ["MediaStrip.svelte"], mechanisms: ["media-gestures", "surface-focus"] },
  shape: "none", states: ["image", "playable", "single"],
  approval: "required", contract: MediaViewerContract,
} as const);
