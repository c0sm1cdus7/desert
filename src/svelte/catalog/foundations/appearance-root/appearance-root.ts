// The DOM half of the appearance (DESIGN §1.6), from infra/appearance-state.ts and infra/catalog-appearance.ts: the
// catalog renderer profile, the chosen theme, tint, wallpaper and text size on the document root, kept in step with
// other tabs, and the platform colour scheme published to the nonvisual store. Unmounting restores the root it found.
import { appearance, storedAppearance, touchesAppearance } from "../../../infra/appearance-state.ts";
import { publishSystemScheme } from "../../../infra/appearance-store.ts";
import { textScale } from "../../../infra/appearance-preferences.ts";

const rootKeys = ["rendererProfile", "theme", "tint", "wallpaper"] as const;

export function mountAppearanceRoot(): () => void {
  const root = document.documentElement, scheme = matchMedia("(prefers-color-scheme: dark)");
  const previous = { ...Object.fromEntries(rootKeys.map(key => [key, root.dataset[key]])), scale: root.style.getPropertyValue("--text-scale") };
  // F1-merge: the renderer profile mark is dropped with the catalog-profile mechanism, and the tint becomes a tint-* class.
  root.dataset.rendererProfile = "apple-reference";
  appearance.set(storedAppearance());
  const unsubscribe = appearance.subscribe(value => {
    if (value.theme === "system") delete root.dataset.theme;
    else root.dataset.theme = value.theme;
    root.dataset.tint = value.tint;
    root.dataset.wallpaper = value.wallpaper;
    root.style.setProperty("--text-scale", String(textScale[value.textSize]));
  });
  const synchronize = (event: StorageEvent) => { if (touchesAppearance(event.key)) appearance.set(storedAppearance()); };
  const publish = () => publishSystemScheme(scheme.matches ? "dark" : "light");
  window.addEventListener("storage", synchronize);
  scheme.addEventListener("change", publish);
  publish();
  return () => {
    unsubscribe();
    window.removeEventListener("storage", synchronize);
    scheme.removeEventListener("change", publish);
    for (const key of rootKeys) {
      const value = previous[key];
      if (value === undefined) delete root.dataset[key];
      else root.dataset[key] = value;
    }
    if (previous.scale) root.style.setProperty("--text-scale", previous.scale);
    else root.style.removeProperty("--text-scale");
  };
}
