// The props of FactRow. `label` names the fact; `value` is its value, `null` or `undefined` when unknown; `references`,
// when given, reads a list value as named object references instead of tags.
import { Type } from "@sinclair/typebox";
import { FactValueSchema } from "../../../../fact-values.ts";
import { ReferenceChoiceSchema } from "../../../../interaction/labels-control.ts";

export const FactRowContract = {
  props: Type.Object({
    label: Type.String(),
    value: Type.Union([FactValueSchema, Type.Null(), Type.Undefined()]),
    references: Type.Optional(Type.Union([Type.Array(ReferenceChoiceSchema), Type.Undefined()])),
  }, { additionalProperties: false }),
} as const;
