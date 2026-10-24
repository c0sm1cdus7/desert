// PlaybackControls: one part (transport, volume or seek) of the controls of a media playback. Its contract stays a stub:
// `playback` is typed by MediaPlayback from src/svelte/infra (migration debt).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PlaybackControlsContract } from "./playback-controls.contract.ts";

export const PlaybackControls = defineComposition({
  id: "playback-controls",
  purpose: "Play, pause, mute, set the volume of and seek a media playback, one part at a time.",
  owner: { entry: "PlaybackControls.svelte" },
  uses: [], approval: "none", contract: PlaybackControlsContract,
} as const);
