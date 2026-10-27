// The props of ContentFlow: the resolved view it lays out, the open media `album` (null for the library root) and its
// `host`: a page (the workspace heads it) or a panel (it heads its own media and lists related selections). Every node
// event reaches `event`; opening an album raises `album`. A caller that binds it may `revealEntry(id)` of its bank, with or
// without focus (`revealAndFocusEntry`), learning whether it could, and `selectMedia(record)` of its library.
import { Type } from "@sinclair/typebox";
import type { ResolvedView } from "../../../../views/resolved.ts";
import { NodeEventSchema } from "../../../../interaction/node-events.ts";
import { ResolvedNodeIdSchema } from "../../../../interaction/catalog.ts";

export const ContentFlowContract = {
  props: Type.Object({
    resolved: Type.Unsafe<ResolvedView>(),
    album: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    host: Type.Optional(Type.Union([Type.Literal("page"), Type.Literal("panel")])),
  }, { additionalProperties: false }),
  events: Type.Object({ event: NodeEventSchema, album: Type.String() }, { additionalProperties: false }),
  instance: Type.Object({
    revealEntry: Type.Function([ResolvedNodeIdSchema], Type.Promise(Type.Boolean())),
    revealAndFocusEntry: Type.Function([ResolvedNodeIdSchema], Type.Promise(Type.Boolean())),
    selectMedia: Type.Function([Type.String()], Type.Boolean()),
  }, { additionalProperties: false }),
} as const;
