// The props of Drawer, the transitional adapter of the piece renamed to modal (design §1.6): the `label`, `open` and
// `locked` state of the temporary surface, the `frame` it shows (and, for a panel instance, its resolved `body`),
// `continuity`, the string identity of the reading context a panel instance keeps across frames (design §3.0: a token,
// never an object compared by reference), and `readingIdentity` within it. `close` asks to dismiss, `closed` reports the
// end of the closing motion; `invoke`, `edit` and `controlEvent` carry the frame's intents, edits and control events.
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";
import type { SurfaceFrame } from "../../../../interaction/surface-frame.ts";
import type { SurfaceIntent } from "../../../../interaction/intent.ts";
import type { ResolvedView } from "../../../../views/resolved.ts";
import type { FormControlEvent } from "../../../../interaction/form-control-event.ts";

export const DrawerContract = {
  props: Type.Object({
    label: text,
    open: Type.Boolean(),
    locked: Type.Optional(Type.Boolean()),
    frame: Type.Unsafe<SurfaceFrame>(),
    body: Type.Optional(Type.Union([Type.Unsafe<ResolvedView>(), Type.Undefined()])),
    continuity: Type.Optional(Type.Union([Type.String(), Type.Undefined()])),
    readingIdentity: Type.Optional(Type.Union([Type.String(), Type.Undefined()])),
    presentation: Type.Optional(Type.Union([Type.Literal("transient"), Type.Undefined()])),
    invoke: Type.Function([Type.Unsafe<SurfaceIntent>()], Type.Void()),
    edit: Type.Optional(Type.Union([Type.Function([Type.String(), Type.String()], Type.Void()), Type.Undefined()])),
    controlEvent: Type.Optional(Type.Union([Type.Function([Type.Unsafe<FormControlEvent>()], Type.Void()), Type.Undefined()])),
  }, { additionalProperties: false }),
  events: Type.Object({ close: Type.Void(), closed: Type.Void() }, { additionalProperties: false }),
} as const;
