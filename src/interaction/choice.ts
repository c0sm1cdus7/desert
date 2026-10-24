// The options of a choice as data: each one's value, text, availability and the optional artwork that leads it. The label
// stays its identity; a leading mark only supplements it.
import { Type, type Static } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import { closed, text } from "../views/definition.ts";
import { AppearanceModeSchema, TintSchema, WallpaperSchema } from "./appearance.ts";
import { FaceSchema } from "./face.ts";
import { ImageSourceSchema } from "./image-source.ts";
import { ReferenceColorSchema } from "./reference-color.ts";

export const ChoiceLeadingSchema = Type.Union([
  closed({ kind: Type.Literal("face"), face: FaceSchema }),
  closed({ kind: Type.Literal("color"), color: ReferenceColorSchema }),
  closed({ kind: Type.Literal("image"), source: ImageSourceSchema, alt: text }),
  closed({ kind: Type.Literal("artwork"), media: Type.Union([Type.Literal("video"), Type.Literal("audio")]) }),
  closed({ kind: Type.Literal("wallpaper"), wallpaper: WallpaperSchema }),
  closed({ kind: Type.Literal("theme"), mode: AppearanceModeSchema, tint: TintSchema, wallpaper: WallpaperSchema }),
  closed({ kind: Type.Literal("symbol"), text: Type.String({ minLength: 1 }) }),
]);
const optionFields = { value: Type.String({ minLength: 1 }), label: text, description: Type.Optional(text), disabled: Type.Boolean() };
export const ChoiceOptionSchema = closed({ ...optionFields, leading: Type.Optional(ChoiceLeadingSchema) });
/** A swatch always leads with its color, and only a system tint has a swatch paint (its tint token). */
export const SwatchOptionSchema = closed({ ...optionFields, leading: closed({ kind: Type.Literal("color"), color: TintSchema }) });

export type ChoiceLeading = Frozen<Static<typeof ChoiceLeadingSchema>>;
export type ChoiceOption = Frozen<Static<typeof ChoiceOptionSchema>>;
export type SwatchOption = Frozen<Static<typeof SwatchOptionSchema>>;
