// The props of Meter: a total split into labelled segments. It draws the total in the display role beside its label, a
// bar whose segments are proportional to their counts, and the legend. `label` names the whole for assistive technology;
// `id` lets a card point at it (aria-describedby), so the card is described by that name.
import { Type } from "@sinclair/typebox";
import { text } from "../../../../views/definition.ts";

export const MeterContract = {
  props: Type.Object({
    total: Type.Integer({ minimum: 0 }),
    totalLabel: text,
    segments: Type.Array(Type.Object({ count: Type.Integer({ minimum: 0 }), label: text }, { additionalProperties: false })),
    label: text,
    id: Type.Optional(Type.String({ minLength: 1 })),
  }, { additionalProperties: false }),
  marks: ["data-meter"],
} as const;
