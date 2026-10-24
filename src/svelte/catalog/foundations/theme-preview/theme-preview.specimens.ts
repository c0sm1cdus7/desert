// One witness of ThemePreview per mode, in two tints and wallpapers.
import type { CatalogSpecimen } from "../../types.d.ts";

export const ThemePreviewSpecimens = [
  { state: "default", variants: { mode: "light" }, props: { mode: "light", tint: "rose", wallpaper: "mist" } },
  { state: "default", variants: { mode: "dark" }, props: { mode: "dark", tint: "blue", wallpaper: "silk" } },
] as const satisfies readonly CatalogSpecimen<"theme-preview">[];
