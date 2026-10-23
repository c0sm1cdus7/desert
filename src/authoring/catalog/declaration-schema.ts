// The one schema of a catalog declaration. defineFoundation/defineComposition/defineMechanism validate
// authored values with it, and the gate validates the data it reads from source with the same schema.
import { Type, type Static } from "@sinclair/typebox";
import { closed, immutable, text } from "../../views/definition.ts";

export const PieceId = immutable(Type.String({ pattern: "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$" }));
const FileName = immutable(Type.String({ pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*\\.(?:svelte|css|ts)$" }));
const unique = <T extends ReturnType<typeof Type.String>>(item: T, minItems = 0) =>
  Type.Array(item, { uniqueItems: true, minItems });
export const Shape = immutable(Type.Union([Type.Literal("capsule"), Type.Literal("radius")]));
const Axis = immutable(Type.Record(PieceId, unique(PieceId, 1), { additionalProperties: false }));
const Slot = closed({ accepts: unique(PieceId, 1), variants: Type.Optional(Axis) });
const Slots = immutable(Type.Record(PieceId, Slot, { additionalProperties: false }));
const Contract = immutable(Type.Object({}, { additionalProperties: true }));

export const FoundationDataSchema = closed({
  id: PieceId, purpose: text,
  owner: closed({ entry: FileName, parts: Type.Optional(unique(FileName)),
    vendor: Type.Optional(unique(PieceId)), mechanisms: Type.Optional(unique(PieceId)) }),
  shape: Shape,
  variantShapes: Type.Optional(Type.Record(PieceId, Type.Record(PieceId, Shape))),
  states: unique(PieceId, 1),
  variants: Type.Optional(Axis),
  slots: Type.Optional(Slots),
  approval: Type.Literal("required"),
  contract: Contract,
});
export const CompositionDataSchema = closed({
  id: PieceId, purpose: text,
  owner: closed({ entry: FileName, parts: Type.Optional(unique(FileName)) }),
  uses: unique(PieceId),
  slots: Type.Optional(Slots),
  authorable: Type.Optional(Type.Boolean()),
  dispatch: Type.Optional(Type.Union([Type.Literal("resolved-node"), Type.Literal("view-content")])),
  approval: Type.Union([Type.Literal("required"), Type.Literal("none")]),
  contract: Contract,
});
export const MechanismDataSchema = closed({ id: PieceId, owner: PieceId, files: unique(FileName, 1) });

export const DeclarationSchemas = Object.freeze({
  foundation: FoundationDataSchema, composition: CompositionDataSchema, mechanism: MechanismDataSchema,
});
export type DeclarationKind = keyof typeof DeclarationSchemas;
export type FoundationData = Static<typeof FoundationDataSchema>;
export type CompositionData = Static<typeof CompositionDataSchema>;
export type MechanismData = Static<typeof MechanismDataSchema>;
export type DeclarationData<K extends DeclarationKind> = Static<(typeof DeclarationSchemas)[K]>;
