// What a Field trigger shows in its well (design §1.3), as pure data: a value or its placeholder, the tags chosen, or an
// image with its text. Popover, Choice and DateControl pass it to `<Field primitive="trigger">`; their contracts reference it.
import { Type, type Static } from "@sinclair/typebox";
import { text } from "../../views/definition.ts";
import { AssetReferenceSchema } from "../../assets/types.ts";

const closed = { additionalProperties: false } as const;

/** One chosen tag: its label, its reference color when it has one, and whether it is still known. */
export const TagViewSchema = Type.Object({
  label: text,
  color: Type.Optional(Type.String()),
  state: Type.Union([Type.Literal("known"), Type.Literal("unavailable")]),
}, closed);
export type TagView = Static<typeof TagViewSchema>;

/** A public URL or a private asset, as Image takes it. */
export const ImageSourceSchema = Type.Union([Type.String(), AssetReferenceSchema]);

export const FieldDisplaySchema = Type.Union([
  /** `placeholder` reads the text as the hint of an empty field rather than its value. */
  Type.Object({ kind: Type.Literal("text"), text, placeholder: Type.Boolean() }, closed),
  Type.Object({ kind: Type.Literal("tags"), tags: Type.Array(TagViewSchema) }, closed),
  Type.Object({ kind: Type.Literal("image"), source: ImageSourceSchema, text }, closed),
]);
export type FieldDisplay = Static<typeof FieldDisplaySchema>;
