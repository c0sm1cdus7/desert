// The props of Popover (design §3.1): its accessible `label`, whether it is `open`, `disabled` (the trigger refuses) or
// `locked` (nothing dismisses it), the `trigger` it draws (an action, or a field showing its value) or, `owned`, the id
// of a trigger its owner foundation draws itself (a choice's inline value, which keeps its own disclosure), what its surface
// holds (`content`: information, a form, a list of options, or a menu of labelled commands), whether it stays anchored
// or becomes a modal sheet when its anchor has no room (`placement`), which trigger edge it aligns to, and `controls`,
// the id of what the trigger controls when that is not the surface itself (the listbox of a list). An action trigger a
// bar mounts (through Menu) is a bar `command` (Action's bar placement). It emits
// `openchange` with the state the person asks for; the owner decides.
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";
import { ActionIconSchema } from "../../../../interaction/action-icon.ts";
import { FieldDisplaySchema, FieldMeasureSchema } from "../../../infra/field-display.ts";

export const PopoverContract = {
  props: Type.Object({
    label: text,
    open: Type.Boolean(),
    disabled: Type.Boolean(),
    locked: Type.Boolean(),
    trigger: Type.Union([
      Type.Object({
        kind: Type.Literal("action"), label: text, icon: ActionIconSchema,
        face: Type.Union([Type.Literal("fit"), Type.Literal("icon")]),
        emphasis: Type.Union([Type.Literal("primary"), Type.Literal("secondary")]),
        state: Type.Union([Type.Literal("ready"), Type.Literal("unavailable"), Type.Literal("pending")]),
        bar: Type.Optional(Type.Literal("command")),
      }, { additionalProperties: false }),
      Type.Object({
        kind: Type.Literal("field"), label: text, required: Type.Boolean(), invalid: Type.Boolean(),
        display: FieldDisplaySchema, measure: FieldMeasureSchema,
      }, { additionalProperties: false }),
      Type.Object({ kind: Type.Literal("owned"), id: Type.String() }, { additionalProperties: false }),
    ]),
    content: Type.Union([Type.Literal("information"), Type.Literal("form"), Type.Literal("list"), Type.Literal("menu")]),
    placement: Type.Union([Type.Literal("anchored"), Type.Literal("adaptive")]),
    align: Type.Union([Type.Literal("start"), Type.Literal("end")]),
    controls: Type.Optional(Type.String()),
  }, { additionalProperties: false }),
  events: Type.Object({ openchange: Type.Boolean() }, { additionalProperties: false }),
  marks: ["data-popover"],
} as const;
