// The props of List: whether it holds rows that open or read objects, or facts (a description list of labels and
// values), its measure (the reading column or the full overview width), the accessible name of a labelled group, and
// `busy` while that group still loads what it holds. Its rows are the `children` slot.
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";

export const ListContract = {
  props: Type.Object({
    kind: Type.Union([Type.Literal("rows"), Type.Literal("facts")]),
    measure: Type.Union([Type.Literal("reading"), Type.Literal("overview")]),
    label: Type.Optional(text),
    busy: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
  marks: ["data-list"],
} as const;
