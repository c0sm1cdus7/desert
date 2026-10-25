// The props of Field (design §1.3). Every field has a label (visible, or for assistive technology only), its required,
// invalid and disabled state, help and error text and a preferred measure. `primitive` picks exclusive variants: a
// single line (`purpose` tells the browser what it holds; `mask` installs a decimal editing syntax; `counter` shows
// the character counter of its `maxLength` in the well, as a multiline editor does; `clear` offers the clear control;
// `focus` takes focus when it appears; `controls` is the id of what the editor controls, as a search its results), a multiline editor with its character counter, or a trigger whose
// well opens a surface an overlay owns (`display` is what the well shows, `disclosure` the button's pure-data link to
// that surface). A `select` trigger is a select control's well: it fits its value (never wider than its slot), shows
// press feedback, shows the value its owner draws in the `selection` slot (a choice's option, with its leading) and says
// that a required choice is required; without a `measure` it takes no measure box and sits where its parent lays it.
// A prop that belongs to another variant is declared `undefined`, so no variant takes another's props.
// `change` is the written value (on input and on blur; a masked value only once valid and complete), `masked` every
// masked edit with its validity, and `open` a trigger's press, ArrowDown or ArrowUp.
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";
import { InputMaskSchema } from "../../../../interaction/input-mask.ts";
import { DisclosureSchema } from "../../../infra/disclosure.ts";
import { FieldDisplaySchema } from "../../../infra/field-display.ts";

export const FieldContract = {
  props: Type.Intersect([Type.Object({
    label: text,
    labelVisibility: Type.Union([Type.Literal("visible"), Type.Literal("accessible")]),
    required: Type.Boolean(),
    invalid: Type.Boolean(),
    disabled: Type.Boolean(),
    helper: Type.Optional(text),
    error: Type.Optional(text),
    identity: Type.Optional(Type.String()),
  }, { additionalProperties: false }), Type.Union([
    Type.Object({
      primitive: Type.Literal("input.text"),
      measure: Type.Union([Type.Literal("writing"), Type.Literal("choice"), Type.Literal("date"), Type.Literal("amount"), Type.Literal("fill")]),
      purpose: Type.Union([Type.Literal("text"), Type.Literal("username"), Type.Literal("new-password"), Type.Literal("current-password"),
        Type.Literal("search")]),
      value: Type.String(),
      placeholder: Type.Optional(text),
      mask: Type.Optional(InputMaskSchema),
      maxLength: Type.Optional(Type.Integer()),
      counter: Type.Optional(Type.Boolean()),
      clear: Type.Boolean(),
      focus: Type.Optional(Type.Literal("on-mount")),
      controls: Type.Optional(Type.String({ minLength: 1 })),
      display: Type.Optional(Type.Undefined()),
      disclosure: Type.Optional(Type.Undefined()),
      select: Type.Optional(Type.Undefined()),
    }, { additionalProperties: false }),
    Type.Object({
      primitive: Type.Literal("input.multiline"),
      measure: Type.Union([Type.Literal("writing"), Type.Literal("choice"), Type.Literal("date"), Type.Literal("amount"), Type.Literal("fill")]),
      value: Type.String(),
      maxLength: Type.Optional(Type.Integer()),
      counter: Type.Optional(Type.Undefined()),
      purpose: Type.Optional(Type.Undefined()),
      placeholder: Type.Optional(Type.Undefined()),
      mask: Type.Optional(Type.Undefined()),
      clear: Type.Optional(Type.Undefined()),
      focus: Type.Optional(Type.Undefined()),
      controls: Type.Optional(Type.Undefined()),
      display: Type.Optional(Type.Undefined()),
      disclosure: Type.Optional(Type.Undefined()),
      select: Type.Optional(Type.Undefined()),
    }, { additionalProperties: false }),
    Type.Object({
      primitive: Type.Literal("trigger"),
      measure: Type.Optional(Type.Union([Type.Literal("writing"), Type.Literal("choice"), Type.Literal("date"), Type.Literal("amount"), Type.Literal("fill")])),
      select: Type.Optional(Type.Boolean()),
      display: FieldDisplaySchema,
      disclosure: DisclosureSchema,
      value: Type.Optional(Type.Undefined()),
      purpose: Type.Optional(Type.Undefined()),
      placeholder: Type.Optional(Type.Undefined()),
      mask: Type.Optional(Type.Undefined()),
      maxLength: Type.Optional(Type.Undefined()),
      counter: Type.Optional(Type.Undefined()),
      clear: Type.Optional(Type.Undefined()),
      focus: Type.Optional(Type.Undefined()),
      controls: Type.Optional(Type.Undefined()),
    }, { additionalProperties: false }),
  ])]),
  events: Type.Object({
    change: Type.String(),
    masked: Type.Object({ value: Type.String(), valid: Type.Boolean(), complete: Type.Boolean() }, { additionalProperties: false }),
    open: Type.Void(),
  }, { additionalProperties: false }),
  marks: ["data-field", "data-field-filled", "data-measure"],
} as const;
