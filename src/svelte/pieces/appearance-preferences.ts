export type AppearancePreferences = Readonly<{
  theme: "system" | "light" | "dark";
  textSize: "standard" | "large" | "larger";
  tint: "blue" | "violet" | "rose" | "green" | "slate";
  wallpaper: "silk" | "mist" | "plain";
}>;

export const defaultAppearance: AppearancePreferences = Object.freeze({ theme: "system", textSize: "standard", tint: "blue", wallpaper: "silk" });
export const appearanceStorageKey = "desert.appearance/2";
export const previousAppearanceStorageKey = "desert.appearance/1";
export const textScale = Object.freeze({ standard: 1, large: 1.15, larger: 1.3 });
export const appearanceChoices = Object.freeze({
  theme: [{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }],
  textSize: [{ value: "standard", label: "Default" }, { value: "large", label: "Large" }, { value: "larger", label: "Larger" }],
  tint: [{ value: "blue", label: "Blue" }, { value: "violet", label: "Violet" }, { value: "rose", label: "Rose" },
    { value: "green", label: "Green" }, { value: "slate", label: "Slate" }],
  wallpaper: [{ value: "silk", label: "Silk" }, { value: "mist", label: "Mist" }, { value: "plain", label: "Plain" }],
} as const);

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
