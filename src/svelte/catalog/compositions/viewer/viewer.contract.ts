// The props of Viewer: the media `items`, the `title` of the set, the `index` shown and whether it is `open`. Paging
// raises `onindex`, opening or closing raises `onopen`, and `onreturn` fires when focus should return to the opener.
import { Type } from "@sinclair/typebox";
import type { ViewerMedia } from "../../../infra/media-source.ts";

export const ViewerContract = {
  props: Type.Object({
    items: Type.Array(Type.Unsafe<ViewerMedia>()),
    title: Type.String(),
    index: Type.Number(),
    open: Type.Boolean(),
  }, { additionalProperties: false }),
  events: Type.Object({
    index: Type.Number(),
    open: Type.Boolean(),
    return: Type.Void(),
  }, { additionalProperties: false }),
} as const;
