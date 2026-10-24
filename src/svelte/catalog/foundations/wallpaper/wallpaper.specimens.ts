// One witness per wallpaper, filling its container (default) and as a choice swatch (preview).
import type { CatalogSpecimen } from "../../types.d.ts";

export const WallpaperSpecimens = [
  { state: "default", variants: { wallpaper: "silk" }, props: { wallpaper: "silk" } },
  { state: "default", variants: { wallpaper: "mist" }, props: { wallpaper: "mist" } },
  { state: "default", variants: { wallpaper: "plain" }, props: { wallpaper: "plain" } },
  { state: "preview", variants: { wallpaper: "silk" }, props: { wallpaper: "silk", preview: true } },
  { state: "preview", variants: { wallpaper: "mist" }, props: { wallpaper: "mist", preview: true } },
  { state: "preview", variants: { wallpaper: "plain" }, props: { wallpaper: "plain", preview: true } },
] as const satisfies readonly CatalogSpecimen<"wallpaper">[];
