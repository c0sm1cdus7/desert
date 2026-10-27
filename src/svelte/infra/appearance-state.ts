// The chosen appearance as nonvisual state: the store every composition reads, the persisted choice, and the writer a
// choice goes through. AppearanceRoot (foundation) is the one place that applies it to the document root.
import { writable } from "svelte/store";
import { appearancePreferences, appearanceStorageKey, previousAppearanceStorageKey, migrateAppearancePreferences,
  defaultAppearance, type AppearancePreferences } from "./appearance-preferences.ts";

export const appearance = writable<AppearancePreferences>(defaultAppearance);
export const appearancePersistence = writable("");

/** The appearance this browser saved, migrated from the previous key, or the default when none (or an unreadable one). */
export function storedAppearance(): AppearancePreferences {
  try {
    const current = localStorage.getItem(appearanceStorageKey);
    if (current !== null) return appearancePreferences(JSON.parse(current)) ?? defaultAppearance;
    return migrateAppearancePreferences(JSON.parse(localStorage.getItem(previousAppearanceStorageKey) ?? "null")) ?? defaultAppearance;
  }
  catch { return defaultAppearance; }
}

/** Whether a storage change under `key` (null: the whole storage was cleared) may change the saved appearance. */
export function touchesAppearance(key: string | null): boolean {
  return key === appearanceStorageKey || key === previousAppearanceStorageKey || key === null;
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
