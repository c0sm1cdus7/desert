// The props of Field (design §1.3). Every field has a label (visible, or for assistive technology only), its required,
// invalid and disabled state, help and error text and a preferred measure. `primitive` picks exclusive variants: a
// single line (`purpose` tells the browser what it holds; `mask` installs a decimal editing syntax; `counter` shows
// the character counter of its `maxLength` in the well, as a multiline editor does; `clear` offers the clear control;
// `focus` takes focus when it appears; a search well names the results it `controls` and, in a toolbar, grows from its toggle while
// `expanded`), a multiline editor with its character counter, or a trigger whose
// well opens a surface an overlay owns (`display` is what the well shows, `disclosure` the button's pure-data link to
// that surface). A prop that belongs to another variant is declared `undefined`, so no variant takes another's props.
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
    measure: Type.Union([Type.Literal("writing"), Type.Literal("choice"), Type.Literal("date"), Type.Literal("amount"), Type.Literal("fill")]),
  }, { additionalProperties: false }), Type.Union([
    Type.Object({
      primitive: Type.Literal("input.text"),
      purpose: Type.Union([Type.Literal("text"), Type.Literal("username"), Type.Literal("new-password"), Type.Literal("current-password"),
        Type.Literal("search")]),
      value: Type.String(),
      placeholder: Type.Optional(text),
      mask: Type.Optional(InputMaskSchema),
      maxLength: Type.Optional(Type.Integer()),
      counter: Type.Optional(Type.Boolean()),
      clear: Type.Boolean(),
      focus: Type.Optional(Type.Literal("on-mount")),
      controls: Type.Optional(Type.String()),
      expanded: Type.Optional(Type.Boolean()),
      display: Type.Optional(Type.Undefined()),
      disclosure: Type.Optional(Type.Undefined()),
    }, { additionalProperties: false }),
    Type.Object({
      primitive: Type.Literal("input.multiline"),
      value: Type.String(),
      maxLength: Type.Optional(Type.Integer()),
      counter: Type.Optional(Type.Undefined()),
      purpose: Type.Optional(Type.Undefined()),
      placeholder: Type.Optional(Type.Undefined()),
      mask: Type.Optional(Type.Undefined()),
      clear: Type.Optional(Type.Undefined()),
      focus: Type.Optional(Type.Undefined()),
      controls: Type.Optional(Type.Undefined()),
      expanded: Type.Optional(Type.Undefined()),
      display: Type.Optional(Type.Undefined()),
      disclosure: Type.Optional(Type.Undefined()),
    }, { additionalProperties: false }),
    Type.Object({
      primitive: Type.Literal("trigger"),
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
      expanded: Type.Optional(Type.Undefined()),
    }, { additionalProperties: false }),
  ])]),
  events: Type.Object({
    change: Type.String(),
    masked: Type.Object({ value: Type.String(), valid: Type.Boolean(), complete: Type.Boolean() }, { additionalProperties: false }),
    open: Type.Void(),
  }, { additionalProperties: false }),
  marks: ["data-field", "data-field-filled", "data-measure", "data-search-expanded"],
} as const;
