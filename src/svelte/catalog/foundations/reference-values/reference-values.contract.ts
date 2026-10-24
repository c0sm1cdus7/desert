// The props of ReferenceValues. `values` are the selected reference ids; `options` are the known references, each read
// by its label (and color, when it has one); an id with no option reads as unavailable.
import { Type } from "@sinclair/typebox";
import { ReferenceChoiceSchema } from "../../../../interaction/labels-control.ts";

export const ReferenceValuesContract = {
  props: Type.Object({
    values: Type.Array(Type.String()),
    options: Type.Array(ReferenceChoiceSchema),
  }, { additionalProperties: false }),
} as const;
