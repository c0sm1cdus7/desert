// The props of Wallpaper. `wallpaper` is the chosen system background (the same values as the appearance preference);
// `preview` draws it as a bounded swatch instead of filling its container.
import { Type } from "@sinclair/typebox";

export const WallpaperContract = {
  props: Type.Object({
    wallpaper: Type.Union([Type.Literal("silk"), Type.Literal("mist"), Type.Literal("plain")]),
    preview: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
} as const;
