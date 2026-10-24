// The props of ThemePreview: the mode it previews and the tint and wallpaper of the appearance preference it shows (the
// same values the preference offers).
import { Type } from "@sinclair/typebox";

export const ThemePreviewContract = {
  props: Type.Object({
    mode: Type.Union([Type.Literal("light"), Type.Literal("dark")]),
    tint: Type.Union([Type.Literal("blue"), Type.Literal("violet"), Type.Literal("rose"), Type.Literal("green"), Type.Literal("slate")]),
    wallpaper: Type.Union([Type.Literal("silk"), Type.Literal("mist"), Type.Literal("plain")]),
  }, { additionalProperties: false }),
  marks: ["data-appearance-preview", "data-tint"],
} as const;
