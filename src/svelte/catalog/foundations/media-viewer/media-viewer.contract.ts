// The props of MediaViewer: the media `items` (images, video and audio), the `title` of the set, the `index` shown and
// whether it is `open`. Paging emits `index`, opening or closing emits `openchange`; the viewer returns focus to the
// element that opened it, or, when the caller names a `returnFocus` key, to what the nearest focus scope holds under that
// key (the card of the shown record), and to the scroll region it was opened in when nothing answers to the key.
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";
import { ViewerMediaSchema } from "../../../infra/viewer-media.ts";

export const MediaViewerContract = {
  props: Type.Object({
    items: Type.Array(ViewerMediaSchema),
    title: text,
    index: Type.Integer({ minimum: 0 }),
    open: Type.Boolean(),
    returnFocus: Type.Optional(Type.String({ minLength: 1 })),
  }, { additionalProperties: false }),
  events: Type.Object({ index: Type.Integer(), openchange: Type.Boolean() }, { additionalProperties: false }),
  marks: ["data-media-viewer", "data-media-stage", "data-media-thumbs"],
} as const;
