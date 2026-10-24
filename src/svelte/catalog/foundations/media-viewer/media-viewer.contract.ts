// The props of MediaViewer: the media `items` (images, video and audio), the `title` of the set, the `index` shown and
// whether it is `open`. Paging emits `index`, opening or closing emits `openchange`; the viewer returns focus to the
// element that opened it.
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";
import { ViewerMediaSchema } from "../../../infra/viewer-media.ts";

export const MediaViewerContract = {
  props: Type.Object({
    items: Type.Array(ViewerMediaSchema),
    title: text,
    index: Type.Integer({ minimum: 0 }),
    open: Type.Boolean(),
  }, { additionalProperties: false }),
  events: Type.Object({ index: Type.Integer(), openchange: Type.Boolean() }, { additionalProperties: false }),
  marks: ["data-media-viewer", "data-media-stage", "data-media-thumbs"],
} as const;
