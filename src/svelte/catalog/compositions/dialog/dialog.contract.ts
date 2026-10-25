// The props of Dialog (DESIGN §3.2): whether it is `open`, whether it is `locked` while its answer commits (then nothing
// dismisses it), the status or object `face` it shows, its `title` and `subtitle`, and its `secondary` and `primary`
// choices; `tone: "destructive"` draws the primary as destructive. A choice raises `invoke` with its intent; Escape or the
// scrim raise `dismiss` (the caller decides what dismissal means) and `closed` fires once the dialog has closed.
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";
import { FaceSchema } from "../../../../interaction/face.ts";
import { SurfaceIntentSchema } from "../../../../interaction/intent.ts";
import { ToolbarActionSchema } from "../../../../interaction/toolbar.ts";

export const DialogContract = {
  props: Type.Object({
    open: Type.Boolean(),
    locked: Type.Boolean(),
    face: Type.Optional(FaceSchema),
    title: text,
    subtitle: Type.Optional(text),
    primary: Type.Optional(ToolbarActionSchema),
    secondary: Type.Optional(ToolbarActionSchema),
    tone: Type.Union([Type.Literal("standard"), Type.Literal("destructive")]),
  }, { additionalProperties: false }),
  events: Type.Object({ invoke: SurfaceIntentSchema, dismiss: Type.Void(), closed: Type.Void() }, { additionalProperties: false }),
} as const;
