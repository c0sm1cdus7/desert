// The props of Modal: its accessible `label`, whether it is `open`, whether it is `locked` (then nothing dismisses it),
// its `presentation` (an adaptive pane docked beside its parent when the host has room; a transient pane; a picker sheet;
// a centred message; the full-screen media stage; the navigation pane), and `continuity`, the string identity of the
// frame it shows and of that frame's reading, which keeps focus and the reading position when the frame is replaced.
// It emits `dismiss` on Escape, the scrim or the grip (the caller decides what dismissal means) and `closed` once its
// exit ends. A caller that binds it notes each invocation it is about to make: `noteInvocation("close")` before Back or
// Close (focus returns to the command that left the frame), `noteInvocation("other")` before anything else.
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";

export const ModalContract = {
  props: Type.Object({
    label: text,
    open: Type.Boolean(),
    locked: Type.Boolean(),
    presentation: Type.Union([Type.Literal("adaptive"), Type.Literal("transient"), Type.Literal("sheet"),
      Type.Literal("message"), Type.Literal("media"), Type.Literal("navigation")]),
    continuity: Type.Optional(Type.Object({
      frame: Type.String(),
      reading: Type.Optional(Type.String()),
    }, { additionalProperties: false })),
  }, { additionalProperties: false }),
  events: Type.Object({ dismiss: Type.Void(), closed: Type.Void() }, { additionalProperties: false }),
  instance: Type.Object({
    noteInvocation: Type.Function([Type.Union([Type.Literal("close"), Type.Literal("other")])], Type.Void()),
  }, { additionalProperties: false }),
  marks: ["data-modal"],
} as const;
