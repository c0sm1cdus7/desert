import { Type, type Static } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import { AssetReferenceSchema } from '../assets/types.ts';

const closed = { additionalProperties: false };
const text = () => Type.String({ minLength: 1 });
export const ReferenceChoiceSchema=Type.Object({value:text(),label:text(),color:Type.Optional(Type.String())},closed);
export const ReferenceStateSchema=Type.Object({options:Type.Array(ReferenceChoiceSchema),loading:Type.Boolean(),busy:Type.Boolean(),
  uncertain:Type.Boolean(),createLabel:Type.Optional(text()),colors:Type.Array(text()),maxLength:Type.Integer({minimum:1}),error:Type.Optional(text())},closed);
export const MediaReferenceStateSchema=Type.Object({options:Type.Array(Type.Object({value:text(),source:AssetReferenceSchema},closed)),
  loading:Type.Boolean(),error:Type.Optional(text())},closed);
export type MediaReferenceState=Frozen<Static<typeof MediaReferenceStateSchema>>;
export const LabelControlLimitsSchema = Type.Object({
  maxItems: Type.Integer({ minimum: 1 }), maxLength: Type.Integer({ minimum: 1 }),
}, closed);
export const LabelsNodeSchema = Type.Object({
  version: Type.Literal("desert.control/1"), kind: Type.Literal("labels"), id: text(), label: text(),
  disabled: Type.Boolean(), values: Type.Array(Type.String()), limits: LabelControlLimitsSchema,
  error: Type.Optional(text()),
  reference:Type.Optional(ReferenceStateSchema),
  mediaReference:Type.Optional(MediaReferenceStateSchema),
}, closed);
export const LabelsEventSchema = Type.Object({
  kind: Type.Literal("labels.change"), control: text(), values: Type.Array(Type.String()),
}, closed);
export type LabelsNode = Frozen<Static<typeof LabelsNodeSchema>>;
export type LabelsInputEvent = Frozen<Static<typeof LabelsEventSchema>>;
export const ReferenceEventSchema=Type.Union([
  Type.Object({kind:Type.Literal('reference.create'),control:text(),name:text(),color:Type.Optional(text())},closed),
  Type.Object({kind:Type.Literal('reference.refresh'),control:text()},closed),
  Type.Object({kind:Type.Literal('reference.recover'),control:text()},closed),
]);
export type ReferenceEvent=Frozen<Static<typeof ReferenceEventSchema>>;
export type ReferenceState=Frozen<Static<typeof ReferenceStateSchema>>;

/** Transport shape only. The operation's compiled input schema owns validation. */
export function labelsInputControl(name: string, label: string, values: readonly string[],
  limits: LabelsNode["limits"], error?: string, reference?:ReferenceState,mediaReference?:MediaReferenceState): LabelsNode {
  return { version: "desert.control/1", kind: "labels", id: name, label, values, limits, disabled: false,
    ...(error ? { error } : {}),...(reference ? {reference} : {}),...(mediaReference?{mediaReference}:{}) };
}
