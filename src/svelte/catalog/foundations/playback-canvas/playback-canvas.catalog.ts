// PlaybackCanvas: the video, or the artwork and audio element, of a media item in the viewer, attached to its playback
// controller, with a retry when the media is unavailable. Its contract stays a stub.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { PlaybackCanvasContract } from "./playback-canvas.contract.ts";

export const PlaybackCanvas = defineFoundation({
  id: "playback-canvas",
  purpose: "Play a video or audio item attached to its playback controller, showing artwork for audio and a retry when unavailable.",
  owner: { entry: "PlaybackCanvas.svelte", vendor: ["slider"] },
  shape: "none", states: ["video", "audio"], approval: "required", contract: PlaybackCanvasContract,
} as const);
