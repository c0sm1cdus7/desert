// MediaPlayer: plays one video or audio item with its own transport, seek and volume controls, inline, in the viewer or
// heading a place, with a retry when the media is unavailable. It is playback-canvas renamed; it absorbs
// playback-controls, and its playback controller (from infra) is internal.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { MediaPlayerContract } from "./media-player.contract.ts";

export const MediaPlayer = defineFoundation({
  id: "media-player",
  purpose: { key: "mediaPlayer.purpose" },
  messages: ["mediaPlayer.purpose", "mediaPlayer.unavailable", "mediaPlayer.retry", "mediaPlayer.elapsed", "mediaPlayer.position", "mediaPlayer.duration", "mediaPlayer.captions", "mediaPlayer.mute", "mediaPlayer.unmute", "mediaPlayer.volume", "mediaPlayer.play", "mediaPlayer.pause"],
  owner: { entry: "MediaPlayer.svelte", mechanisms: ["press-feedback"], parts: ["playback.svelte.ts", "Transport.svelte", "Seek.svelte", "Volume.svelte"] },
  shape: "none", states: ["video", "audio"],
  variants: { presentation: ["inline", "viewer", "header"] },
  slots: { overlay: { accepts: ["action"] }, strip: { accepts: ["image"] } },
  approval: "required", contract: MediaPlayerContract,
} as const);
