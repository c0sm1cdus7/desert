import { Type, type Static, type TProperties } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import { FaceSchema } from "./face.ts";
import { InputMaskSchema } from "./input-mask.ts";
import { MoneyMinorUnitsLimit } from "./money.ts";
import { AssetReferenceSchema } from "../assets/types.ts";

const object = <T extends TProperties>(properties: T) => Type.Object(properties, { additionalProperties: false });
const text = () => Type.String({ minLength: 1 });
const integer = (minimum = 0) => Type.Integer({ minimum, maximum: Number.MAX_SAFE_INTEGER });
const base = { version: Type.Literal("desert.control/1"), id: text(), label: text(), disabled: Type.Boolean() };
const option = object({ value: text(), label: text(), disabled: Type.Boolean(), description: Type.Optional(text()) });
const day = Type.String({ pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$" });
const minor = Type.String({ pattern: "^-?(0|[1-9][0-9]*)$", maxLength: MoneyMinorUnitsLimit });
const source = Type.Union([Type.Null(), Type.String({ pattern: "^/(?!/)[^\\\\\\s]*$" }),
  object({ asset: Type.String({ pattern: "^[a-zA-Z0-9][a-zA-Z0-9._-]*$" }) }), AssetReferenceSchema]);

export const OptionsNodeSchema = object({ ...base, kind: Type.Literal("options"),
  inputRequired: Type.Optional(Type.Boolean()),
  minSelected: integer(), maxSelected: integer(1), selected: Type.Array(text(), { uniqueItems: true }),
  options: Type.Array(option, { minItems: 1 }) });
export const MoneyNodeSchema = object({ ...base, kind: Type.Literal("money"), required: Type.Boolean(),
  locale: Type.Optional(InputMaskSchema.properties.locale),
  currencies: Type.Array(object({ code: Type.String({ pattern: "^[A-Z]{3}$" }), scale: Type.Integer({ minimum: 0, maximum: 6 }),
    face: Type.Optional(FaceSchema) }), { minItems: 1 }),
  currency: text(), minorUnits: Type.Union([Type.Null(), minor]) });
export const DateNodeSchema = object({ ...base, kind: Type.Literal("date"), required: Type.Boolean(),
  value: Type.Union([Type.Null(), day]), minimum: Type.Optional(day), maximum: Type.Optional(day) });
/** The tones a tag carries: neutral, or a semantic accent the tag pairs with its text. */
export const TagToneSchema = Type.Union([Type.Literal("neutral"), Type.Literal("accent"), Type.Literal("success"), Type.Literal("warning"),
  Type.Literal("destructive")]);
export const TagNodeSchema = object({ ...base, kind: Type.Literal("tag"), tone: TagToneSchema });
export const ImageNodeSchema = object({ ...base, kind: Type.Literal("image"), source, alt: text(),
  aspect: Type.Union([Type.Literal("square"), Type.Literal("landscape"), Type.Literal("portrait")]) });
export const AvatarNodeSchema = object({ ...base, kind: Type.Literal("avatar"), source,
  fallback: Type.String({ minLength: 1, maxLength: 4 }) });
export const ExtendedNodeSchemas = [OptionsNodeSchema, MoneyNodeSchema, DateNodeSchema, TagNodeSchema, ImageNodeSchema, AvatarNodeSchema] as const;
export const ExtendedNodeSchema = Type.Union([...ExtendedNodeSchemas]);
export type ExtendedNode = Frozen<Static<typeof ExtendedNodeSchema>>;
export type OptionsNode = Extract<ExtendedNode, { kind: "options" }>;
export type MoneyNode = Extract<ExtendedNode, { kind: "money" }>;
export type DateNode = Extract<ExtendedNode, { kind: "date" }>;
export type TagNode = Extract<ExtendedNode, { kind: "tag" }>;
export type ImageNode = Extract<ExtendedNode, { kind: "image" }>;
export type AvatarNode = Extract<ExtendedNode, { kind: "avatar" }>;

export const ExtendedEventSchemas = [
  object({ kind: Type.Literal("options.change"), control: text(), selected: Type.Array(text(), { uniqueItems: true }) }),
  object({ kind: Type.Literal("money.change"), control: text(), currency: text(), minorUnits: Type.Union([Type.Null(), minor]) }),
  object({ kind: Type.Literal("date.change"), control: text(), value: Type.Union([Type.Null(), day]) }),
] as const;
export const ExtendedEventSchema = Type.Union([...ExtendedEventSchemas]);
export type ExtendedEvent = Frozen<Static<typeof ExtendedEventSchema>>;
