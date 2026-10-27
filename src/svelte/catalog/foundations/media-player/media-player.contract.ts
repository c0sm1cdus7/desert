// The props of MediaPlayer: one video or audio item (a closed PlayableMedia: its source, text alternative, captions and
// optional artwork) and where it plays: inline in a page, in the viewer (filling the stage, its overlay slot holding the
// viewer's paging and its strip slot the viewer's thumbnails between transport and volume), or heading a place. Its
// playback controller stays inside it: a caller that binds it may only toggle or stop playback. `unavailable` fires when
// the media cannot load.
import { Type } from "@sinclair/typebox";
import { PlayableMediaSchema } from "../../../infra/viewer-media.ts";

export const MediaPlayerContract = {
  props: Type.Object({
    item: PlayableMediaSchema,
    presentation: Type.Union([Type.Literal("inline"), Type.Literal("viewer"), Type.Literal("header")]),
  }, { additionalProperties: false }),
  events: Type.Object({ unavailable: Type.Void() }, { additionalProperties: false }),
  instance: Type.Object({
    toggle: Type.Function([], Type.Promise(Type.Void())),
    stop: Type.Function([], Type.Void()),
  }, { additionalProperties: false }),
  marks: ["data-media-player", "data-media-player-presentation", "data-media-band"],
} as const;
