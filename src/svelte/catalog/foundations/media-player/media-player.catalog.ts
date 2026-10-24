// MediaPlayer: plays one video or audio item with its own transport, seek and volume controls, inline, in the viewer or
// heading a place, with a retry when the media is unavailable. It is playback-canvas renamed; it absorbs
// playback-controls, and its playback controller (from infra) is internal.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { MediaPlayerContract } from "./media-player.contract.ts";

export const MediaPlayer = defineFoundation({
  id: "media-player",
  purpose: "Play a video or audio item with its transport, seek and volume controls, showing artwork for audio and a retry when unavailable.",
  owner: { entry: "MediaPlayer.svelte", parts: ["playback.svelte.ts", "Transport.svelte", "Seek.svelte", "Volume.svelte"],
    // F1-merge: the slider family moves to the slider foundation (F1d), which the player then mounts.
    vendor: ["slider"] },
  shape: "none", states: ["video", "audio"],
  variants: { presentation: ["inline", "viewer", "header"] },
  slots: { overlay: { accepts: ["action"] }, strip: { accepts: ["image"] } },
  approval: "required", contract: MediaPlayerContract,
} as const);
