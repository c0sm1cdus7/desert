// The props of Choice: a labelled choice among options given as data. `presentation` draws them as rows (radio or
// checkbox), cards (an artwork above each label), swatches (a system tint each) or a menu (a trigger that opens the
// list). `cardinality` is one or many; a menu and swatches choose one. `selected` holds the chosen values and `change`
// reports the next selection. `labelVisibility` shows the legend of rows, cards and swatches or keeps it for assistive
// technology only (a titled stack already shows it); a menu's trigger always carries the label. Only a menu has a trigger
// presentation (`menuTrigger`: a field well, inline beside a value, or a contextual value at a row's end), a
// `placeholder` while nothing is chosen and a `measure`: `choice` boxes it at the choice measure of the field family
// (a select control), the measure every other field of a form keeps. Rows stand in their own pane at the reading
// measure, or with `frame: "interior"` inside the pane that hosts them (a popover), never a second pane within it.
import { Type } from "@sinclair/typebox";
import { ChoiceOptionSchema, SwatchOptionSchema } from "../../../../interaction/choice.ts";
import { text } from "../../../../views/definition.ts";

export const ChoiceContract = {
  props: Type.Intersect([Type.Object({
    label: text,
    labelVisibility: Type.Union([Type.Literal("visible"), Type.Literal("accessible")]),
    selected: Type.Array(Type.String()),
    disabled: Type.Boolean(),
    required: Type.Boolean(),
  }, { additionalProperties: false }), Type.Union([
    Type.Object({ presentation: Type.Literal("rows"), cardinality: Type.Union([Type.Literal("one"), Type.Literal("many")]),
      options: Type.Array(ChoiceOptionSchema), menuTrigger: Type.Optional(Type.Undefined()), placeholder: Type.Optional(Type.Undefined()),
      measure: Type.Optional(Type.Undefined()), frame: Type.Optional(Type.Union([Type.Literal("pane"), Type.Literal("interior")])) },
      { additionalProperties: false }),
    Type.Object({ presentation: Type.Literal("cards"), cardinality: Type.Union([Type.Literal("one"), Type.Literal("many")]),
      options: Type.Array(ChoiceOptionSchema), menuTrigger: Type.Optional(Type.Undefined()), placeholder: Type.Optional(Type.Undefined()),
      measure: Type.Optional(Type.Undefined()), frame: Type.Optional(Type.Undefined()) },
      { additionalProperties: false }),
    Type.Object({ presentation: Type.Literal("swatches"), cardinality: Type.Literal("one"),
      options: Type.Array(SwatchOptionSchema), menuTrigger: Type.Optional(Type.Undefined()), placeholder: Type.Optional(Type.Undefined()),
      measure: Type.Optional(Type.Undefined()), frame: Type.Optional(Type.Undefined()) },
      { additionalProperties: false }),
    Type.Object({ presentation: Type.Literal("menu"), cardinality: Type.Literal("one"), options: Type.Array(ChoiceOptionSchema),
      menuTrigger: Type.Union([Type.Literal("well"), Type.Literal("inline"), Type.Literal("contextual")]), placeholder: Type.Optional(text),
      measure: Type.Optional(Type.Literal("choice")), frame: Type.Optional(Type.Undefined()) },
      { additionalProperties: false }),
  ])]),
  events: Type.Object({ change: Type.Array(Type.String()) }, { additionalProperties: false }),
  marks: ["data-choice", "data-choice-option", "data-choice-measure"],
} as const;
