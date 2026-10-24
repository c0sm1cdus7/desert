// The props of ToolbarMediaControls: the media-controls content of a toolbar (the media, the selected index, how to
// select another, and the playback of the selected one).
import { Type } from "@sinclair/typebox";
import type { ToolbarContent } from "../../../infra/toolbar-content.ts";

export const ToolbarMediaControlsContract = {
  props: Type.Object({
    content: Type.Unsafe<Extract<ToolbarContent, { kind: "media-controls" }>>(),
  }, { additionalProperties: false }),
} as const;
