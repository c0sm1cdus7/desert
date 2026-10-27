import type { AppearanceMode, Tint, Wallpaper } from "../../interaction/appearance.ts";
import { m } from "../../messages/keys.ts";

export type AppearancePreferences = Readonly<{
  theme: "system" | AppearanceMode;
  textSize: "standard" | "large" | "larger";
  tint: Tint;
  wallpaper: Wallpaper;
}>;

export const defaultAppearance: AppearancePreferences = Object.freeze({ theme: "system", textSize: "standard", tint: "blue", wallpaper: "silk" });
export const appearanceStorageKey = "desert.appearance/2";
export const previousAppearanceStorageKey = "desert.appearance/1";
export const textScale = Object.freeze({ standard: 1, large: 1.15, larger: 1.3 });
/** The choices of each preference: its stored value and the message a person reads (owned by appearance-preferences). */
export const appearanceChoices = Object.freeze({
  theme: [{ value: "dark", label: m.appearancePreferences.dark }, { value: "light", label: m.appearancePreferences.light }],
  textSize: [{ value: "standard", label: m.appearancePreferences.standard }, { value: "large", label: m.appearancePreferences.large }, { value: "larger", label: m.appearancePreferences.larger }],
  tint: [{ value: "blue", label: m.appearancePreferences.blue }, { value: "violet", label: m.appearancePreferences.violet }, { value: "rose", label: m.appearancePreferences.rose },
    { value: "green", label: m.appearancePreferences.green }, { value: "slate", label: m.appearancePreferences.slate }],
  wallpaper: [{ value: "silk", label: m.appearancePreferences.silk }, { value: "mist", label: m.appearancePreferences.mist }, { value: "plain", label: m.appearancePreferences.plain }],
} as const);

/** The theme's tint utility of each tint (personalization), written literally so the theme's Tailwind scan sees each. */
export const tintClass = Object.freeze({ blue: "tint-blue", violet: "tint-violet", rose: "tint-rose", green: "tint-green", slate: "tint-slate" } as const) satisfies Readonly<Record<AppearancePreferences["tint"], string>>;

export function appearancePreferences(value: unknown): AppearancePreferences | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).length !== 4) return null;
  // Keep the old stored value readable; it is no longer an offered control option.
  if (candidate.theme !== "system" && !appearanceChoices.theme.some(option => option.value === candidate.theme)) return null;
  for (const key of ["textSize", "tint", "wallpaper"] as const)
    if (!appearanceChoices[key].some(option => option.value === candidate[key])) return null;
  return Object.freeze({ theme: candidate.theme, textSize: candidate.textSize, tint: candidate.tint, wallpaper: candidate.wallpaper }) as AppearancePreferences;
}

export function effectiveAppearanceTheme(theme: AppearancePreferences["theme"], systemDark: boolean): "light" | "dark" {
  return theme === "system" ? systemDark ? "dark" : "light" : theme;
}

export function migrateAppearancePreferences(value: unknown): AppearancePreferences | null {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length !== 2) return null;
  return appearancePreferences({ ...defaultAppearance, ...value });
}
