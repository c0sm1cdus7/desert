// One witness of AppearancePreferences: the default appearance, every choice enabled.
import type { CatalogSpecimen } from "../../types.d.ts";

export const AppearancePreferencesSpecimens = [
  { state: "default", props: { value: { theme: "system", textSize: "standard", tint: "blue", wallpaper: "silk" } } },
] as const satisfies readonly CatalogSpecimen<"appearance-preferences">[];
