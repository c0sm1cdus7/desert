import { Type, type Static } from "@sinclair/typebox";
import { RequirementsSchema } from "./dependencies.ts";
import { FieldRepresentationsSchema } from "./field-representation.ts";
import { ConnectionPolicySchema } from "./connection-policy.ts";

const closed = { additionalProperties: false };
const Name = Type.String({ minLength: 1 });
const Names = Type.Array(Name, { uniqueItems: true });
const Scalar = Type.Union([Type.String(), Type.Integer({ minimum: Number.MIN_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER })]);
const Expression = Type.Union([
  Type.Object({ kind: Type.Literal("input"), field: Name }, closed),
  Type.Object({ kind: Type.Literal("actor") }, closed),
  Type.Object({ kind: Type.Literal("literal"), value: Type.Union([Scalar, Type.Tuple([])]) }, closed),
]);
const Assignments = Type.Record(Name, Expression, { minProperties: 1, ...closed });
const Base = { id: Name, object: Name, input: Names };
export const CommandSchema = Type.Union([
  Type.Object({ ...Base, kind: Type.Literal("create"), values: Assignments }, closed),
  Type.Object({ ...Base, kind: Type.Literal("update"), when: Type.Record(Name, Scalar, closed), set: Assignments }, closed),
]);
export const JourneySchema = Type.Union([
  Type.Object({ id: Name, kind: Type.Literal("mutation"), command: CommandSchema, requires: RequirementsSchema,
    confirmation: Type.Literal("prepared-effect"), outcome: Type.Literal("receipt") }, closed),
  Type.Object({ id: Name, kind: Type.Literal("read"), object: Name, requires: RequirementsSchema,
    where: Type.Optional(Type.Record(Name, Scalar, closed)),
    fields: Type.Array(Name, { minItems: 1, uniqueItems: true }),
    collection: Type.Array(Name, { minItems: 1, uniqueItems: true }) }, closed),
]);
export const PolicySchema = Type.Object({ kind: Type.Literal("ownership"), object: Name, field: Name }, closed);
const SurfaceBase = { id: Name, journeys: Type.Array(Name, { minItems: 1, uniqueItems: true }) };
const HumanSurfaceProperties = {
  ...SurfaceBase, kind: Type.Literal("human"),
  fieldRepresentations: FieldRepresentationsSchema,
  commit: Type.Record(Name, Type.Union([Type.Literal("submit"), Type.Literal("review"), Type.Literal("confirm")]), closed),
  language: Type.Object({ locale: Name, fields: Type.Record(Name, Name, closed), journeys: Type.Record(Name, Name, closed) }, closed),
  connection: ConnectionPolicySchema,
};
export const ViewExposureSchema = Type.Union([
  Type.Object({ ...SurfaceBase, kind: Type.Literal("agent") }, closed),
  Type.Object(HumanSurfaceProperties, closed),
]);
export const ExposureSchema = ViewExposureSchema;

export type CommandDefinition = Static<typeof CommandSchema>;
export type JourneyDefinition = Static<typeof JourneySchema>;
export type ExposureDefinition = Static<typeof ExposureSchema>;
export type PolicyDefinition = Static<typeof PolicySchema>;
export type ExpressionDefinition = Static<typeof Expression>;
