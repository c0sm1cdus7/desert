// The props of PlaybackControls: the media playback it controls and which part of its controls it draws (transport,
// volume or seek). `hasCaptions` adds the captions toggle to the volume part. MediaPlayback is named through the toolbar
// content that carries it, since its own module (playback.svelte.ts) is a runes module.
import { Type } from "@sinclair/typebox";
import type { ToolbarContent } from "../../../infra/toolbar-content.ts";

export const PlaybackControlsContract = {
  props: Type.Object({
    playback: Type.Unsafe<Extract<ToolbarContent, { kind: "media-controls" }>["playback"]>(),
    part: Type.Union([Type.Literal("transport"), Type.Literal("volume"), Type.Literal("seek")]),
    hasCaptions: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
} as const;
