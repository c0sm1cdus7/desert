// The props of Dialog (DESIGN §3.2; laws 5b, 6, 9c): whether it is `open`, whether it is `locked` while its answer
// commits (then nothing dismisses it), the status or action `face` it always shows, its `title` and `subtitle` (both
// required: a dialog is face + title + subtitle + its choices, nothing else), its `secondary` choice (always: the way out)
// and its optional `primary`; the choices are Bar's 50/50 commit pair, a single choice takes the full width.
// `tone: "destructive"` draws the primary as destructive. A choice raises `invoke` with its intent; Escape or the
// scrim raise `dismiss` (the caller decides what dismissal means) and `closed` fires once the dialog has closed.
// The problem node's adapter (`renders: ["problem"]`, DESIGN §4 item 62) is the second variant: the node's own `title`,
// `description` and `severity`; Dialog draws the severity's status face, the description as its subtitle and one Close,
// which raises `dismiss` unless the problem is `locked` (then the Close is unavailable).
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";
import { FaceSchema } from "../../../../interaction/face.ts";
import { SurfaceIntentSchema } from "../../../../interaction/intent.ts";
import { ToolbarActionSchema } from "../../../../interaction/toolbar.ts";

export const DialogContract = {
  props: Type.Union([
    Type.Object({
      open: Type.Boolean(),
      locked: Type.Boolean(),
      face: FaceSchema,
      title: text,
      subtitle: text,
      primary: Type.Optional(ToolbarActionSchema),
      secondary: ToolbarActionSchema,
      tone: Type.Union([Type.Literal("standard"), Type.Literal("destructive")]),
      description: Type.Optional(Type.Undefined()),
      severity: Type.Optional(Type.Undefined()),
    }, { additionalProperties: false }),
    Type.Object({
      open: Type.Boolean(),
      locked: Type.Boolean(),
      face: Type.Optional(Type.Undefined()),
      title: text,
      subtitle: Type.Optional(Type.Undefined()),
      primary: Type.Optional(Type.Undefined()),
      secondary: Type.Optional(Type.Undefined()),
      tone: Type.Optional(Type.Undefined()),
      description: text,
      severity: Type.Union([Type.Literal("error"), Type.Literal("warning")]),
    }, { additionalProperties: false }),
  ]),
  events: Type.Object({ invoke: SurfaceIntentSchema, dismiss: Type.Void(), closed: Type.Void() }, { additionalProperties: false }),
} as const;
