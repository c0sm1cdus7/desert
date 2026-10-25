// The props of Modal: its accessible `label` (a sheet's top bar shows it as its title, with `subtitle` under it naming the
// subject the sheet edits), whether it is `open`, whether it is `locked` (then nothing dismisses it),
// its `presentation` (an adaptive pane docked beside its parent when the host has room; a transient pane; a picker sheet;
// a centred message; the full-screen media stage; the navigation pane), and `continuity`, the string identity of the
// frame it shows and of that frame's reading, which keeps focus and the reading position when the frame is replaced.
// A message may name the visible heading and sentence it holds (`labelledBy`, `describedBy`: their ids), which then name
// and describe the dialog instead of a hidden title; its `actions` stay in view below its content, which scrolls.
// It emits `dismiss` on Escape, the scrim or the grip (the caller decides what dismissal means) and `closed` once its
// exit ends. A caller that binds it notes each invocation it is about to make: `noteInvocation("close")` before Back or
// Close (focus returns to the command that left the frame), `noteInvocation("other")` before anything else.
// The navigation pane may follow a pointer before it opens (`navigation`): `panel` is the id its controls name, `reveal`
// the pointer's travel while the edge swipe previews it (the pane is then drawn although closed), `dismissOffset` the
// travel of a dismissing swipe, and `gesture` whether the swipe opened it (its entrance then adds no motion of its own).
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";

export const ModalContract = {
  props: Type.Object({
    label: text,
    subtitle: Type.Optional(text),
    open: Type.Boolean(),
    locked: Type.Boolean(),
    presentation: Type.Union([Type.Literal("adaptive"), Type.Literal("transient"), Type.Literal("sheet"),
      Type.Literal("message"), Type.Literal("media"), Type.Literal("navigation")]),
    labelledBy: Type.Optional(Type.String({ minLength: 1 })),
    describedBy: Type.Optional(Type.String({ minLength: 1 })),
    navigation: Type.Optional(Type.Object({
      panel: Type.String({ minLength: 1 }),
      reveal: Type.Optional(Type.Number()),
      dismissOffset: Type.Number(),
      gesture: Type.Boolean(),
    }, { additionalProperties: false })),
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
