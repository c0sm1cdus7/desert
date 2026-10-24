// The props of Loading: content that is on its way, drawn as skeleton lines (a block of text to come) or a spinner (a
// state to come). Assistive technology hears `label` as a status; the drawing itself is hidden from it.
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";

export const LoadingContract = {
  props: Type.Object({
    kind: Type.Union([Type.Literal("lines"), Type.Literal("spinner")]),
    label: text,
  }, { additionalProperties: false }),
  marks: ["data-loading"],
} as const;
