import { writable } from "svelte/store";
import { appearancePreferences, appearanceStorageKey, previousAppearanceStorageKey, migrateAppearancePreferences,
  defaultAppearance, textScale, type AppearancePreferences } from "./appearance-preferences.ts";

export const appearance = writable<AppearancePreferences>(defaultAppearance);
export const appearancePersistence = writable("");

function storedAppearance(): AppearancePreferences {
  try {
    const current = localStorage.getItem(appearanceStorageKey);
    if (current !== null) return appearancePreferences(JSON.parse(current)) ?? defaultAppearance;
    return migrateAppearancePreferences(JSON.parse(localStorage.getItem(previousAppearanceStorageKey) ?? "null")) ?? defaultAppearance;
  }
  catch { return defaultAppearance; }
}

export function chooseAppearance(value: AppearancePreferences): void {
  const checked = appearancePreferences(value);
  if (!checked) throw new Error("INVALID_APPEARANCE");
  appearance.set(checked);
  try {
    localStorage.setItem(appearanceStorageKey, JSON.stringify(checked));
    appearancePersistence.set("");
  } catch { appearancePersistence.set("Applied for this session. This browser could not save your preference."); }
}

export function mountAppearancePreferences(): () => void {
  const root = document.documentElement;
  const previous = { theme: root.dataset.theme, tint: root.dataset.tint, wallpaper: root.dataset.wallpaper,
    scale: root.style.getPropertyValue("--text-scale") };
  appearance.set(storedAppearance());
  const unsubscribe = appearance.subscribe(value => {
    if (value.theme === "system") delete root.dataset.theme;
    else root.dataset.theme = value.theme;
    root.dataset.tint = value.tint;
    root.dataset.wallpaper = value.wallpaper;
    root.style.setProperty("--text-scale", String(textScale[value.textSize]));
  });
  const synchronize = (event: StorageEvent) => {
    if (event.key === appearanceStorageKey || event.key === previousAppearanceStorageKey || event.key === null) appearance.set(storedAppearance());
  };
  window.addEventListener("storage", synchronize);
  return () => {
    unsubscribe();
    window.removeEventListener("storage", synchronize);
    if (previous.theme === undefined) delete root.dataset.theme;
    else root.dataset.theme = previous.theme;
    for (const key of ["tint", "wallpaper"] as const) {
      if (previous[key] === undefined) delete root.dataset[key];
      else root.dataset[key] = previous[key];
    }
    if (previous.scale) root.style.setProperty("--text-scale", previous.scale);
    else root.style.removeProperty("--text-scale");
  };
}
