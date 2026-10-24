// The one schema of a catalog declaration. defineFoundation/defineComposition/defineMechanism validate
// authored values with it, and the gate validates the data it reads from source with the same schema.
import { Type, type Static } from "@sinclair/typebox";
import { closed, immutable, text } from "../../views/definition.ts";

export const PieceId = immutable(Type.String({ pattern: "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$" }));
const FileName = immutable(Type.String({ pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*\\.(?:svelte|css|ts)$" }));
/** A static file the build template serves at its root (`bank-image.svg`): a bare file name, never a path. */
const AssetName = immutable(Type.String({ pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*\\.(?:svg|png|jpg|webp)$" }));
const unique = <T extends ReturnType<typeof Type.String>>(item: T, minItems = 0) =>
  Type.Array(item, { uniqueItems: true, minItems });
/** Curvature family of a foundation (owner decision Q3): capsule or radius; "none" for pieces that own no rounded geometry. */
export const Shape = immutable(Type.Union([Type.Literal("capsule"), Type.Literal("radius"), Type.Literal("none")]));
/** A variant axis is a prop of the contract (camelCase name); its values are that prop's literals (ids like `input.text`). */
export const AxisName = immutable(Type.String({ pattern: "^[a-z][A-Za-z0-9]*$" }));
export const AxisValue = immutable(Type.String({ pattern: "^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$" }));
const Axis = immutable(Type.Record(AxisName, unique(AxisValue, 1), { additionalProperties: false }));
const Slot = closed({ accepts: unique(PieceId, 1), variants: Type.Optional(Axis) });
const Slots = immutable(Type.Record(PieceId, Slot, { additionalProperties: false }));
const Contract = immutable(Type.Object({}, { additionalProperties: true }));
/** Resolved node kinds a piece renders for the node dispatcher (`input.text`, `control.select`); rule B checks them against
 * the resolved-node grammar: every kind rendered by exactly one piece. */
const Renders = unique(immutable(Type.String({ pattern: "^[a-z]+(?:\\.[a-z]+)?$" })), 1);

export const FoundationDataSchema = closed({
  id: PieceId, purpose: text,
  owner: closed({ entry: FileName, parts: Type.Optional(unique(FileName)),
    vendor: Type.Optional(unique(PieceId)), mechanisms: Type.Optional(unique(PieceId)) }),
  shape: Shape,
  variantShapes: Type.Optional(Type.Record(PieceId, Type.Record(PieceId, Shape))),
  states: unique(PieceId, 1),
  variants: Type.Optional(Axis),
  /** A state that exists only for some variant values (TextInput's `masked` is single-line only): rule J then requires
   * no specimen elsewhere, and the contract's exclusive variants make one there fail to type-check. */
  stateVariants: Type.Optional(Type.Record(PieceId, Axis, { additionalProperties: false })),
  slots: Type.Optional(Slots),
  renders: Type.Optional(Renders),
  /** The template's static files this foundation draws (rule T qualifies each through exactly one foundation). */
  assets: Type.Optional(unique(AssetName, 1)),
  approval: Type.Literal("required"),
  contract: Contract,
});
export const CompositionDataSchema = closed({
  id: PieceId, purpose: text,
  owner: closed({ entry: FileName, parts: Type.Optional(unique(FileName)) }),
  uses: unique(PieceId),
  slots: Type.Optional(Slots),
  authorable: Type.Optional(Type.Boolean()),
  renders: Type.Optional(Renders),
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
