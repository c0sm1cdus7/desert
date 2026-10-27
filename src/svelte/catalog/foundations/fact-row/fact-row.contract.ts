// The props of FactRow. `label` names the fact. A `value` row reads its `value` (`null` or `undefined` when unknown) as
// text, as tags when it is a list, or, given `references`, as named object references; a `control` row holds the control
// that changes the fact (an object state's menu) in its `control` slot. `kind` may be left out for a value row while the
// compositions that mount FactRow have not migrated (slice 3).
import { Type } from "@sinclair/typebox";
import { FactValueSchema } from "../../../../fact-values.ts";
import { ReferenceChoiceSchema } from "../../../../interaction/labels-control.ts";
import { text } from "../../../../views/definition.ts";

export const FactRowContract = {
  props: Type.Union([
    Type.Object({
      kind: Type.Optional(Type.Literal("value")),
      label: text,
      value: Type.Union([FactValueSchema, Type.Null(), Type.Undefined()]),
      references: Type.Optional(Type.Union([Type.Array(ReferenceChoiceSchema), Type.Undefined()])),
    }, { additionalProperties: false }),
    Type.Object({
      kind: Type.Literal("control"),
      label: text,
      value: Type.Optional(Type.Undefined()),
      references: Type.Optional(Type.Undefined()),
    }, { additionalProperties: false }),
  ]),
  marks: ["data-fact-kind"],
} as const;
