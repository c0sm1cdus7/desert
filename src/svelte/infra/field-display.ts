// What a field trigger shows and how wide it prefers to be, as data (design §1.3, the `trigger` primitive of Field). The
// overlays that open from a field (popover, choice, date-control) and Field itself reference these schemas; no other
// copy of either union exists.
// F1-merge: Field's contract (lane F1b) references FieldDisplaySchema and FieldMeasureSchema from here.
import { Type, type Static } from "@sinclair/typebox";
import { text } from "../../views/definition.ts";
import { AssetReferenceSchema } from "../../assets/types.ts";

/** The preferred measure of a field's family: writing, a choice, a date, an amount, or the whole slot. */
export const FieldMeasureSchema = Type.Union([Type.Literal("writing"), Type.Literal("choice"), Type.Literal("date"),
  Type.Literal("amount"), Type.Literal("fill")]);
export type FieldMeasure = Static<typeof FieldMeasureSchema>;

/** A trigger's value: a line of text (or its placeholder), the tags already chosen, or a chosen image with its name. */
export const FieldDisplaySchema = Type.Union([
  Type.Object({ kind: Type.Literal("text"), text, placeholder: Type.Boolean() }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal("tags"), tags: Type.Array(Type.Object({ label: text, color: Type.Optional(Type.String()) },
    { additionalProperties: false })) }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal("image"), source: Type.Union([Type.String(), AssetReferenceSchema]), text },
    { additionalProperties: false }),
]);
export type FieldDisplay = Static<typeof FieldDisplaySchema>;
