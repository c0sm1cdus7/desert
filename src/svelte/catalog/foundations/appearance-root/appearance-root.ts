// The DOM half of the appearance (DESIGN §1.6), from infra/appearance-state.ts and infra/catalog-appearance.ts: the
// catalog renderer profile, the chosen theme, tint, wallpaper and text size on the document root, kept in step with
// other tabs, and the platform colour scheme published to the nonvisual store. Unmounting restores the root it found.
import { appearance, storedAppearance, touchesAppearance } from "../../../infra/appearance-state.ts";
import { publishSystemScheme } from "../../../infra/appearance-store.ts";
import { textScale } from "../../../infra/appearance-preferences.ts";

const rootKeys = ["rendererProfile", "theme", "tint", "wallpaper"] as const;

export function mountAppearanceRoot(): () => void {
  const root = document.documentElement, scheme = matchMedia("(prefers-color-scheme: dark)");
  const previous = new Map(rootKeys.map(key => [key, root.dataset[key]] as const));
  const previousScale = root.style.getPropertyValue("--text-scale");
  // The renderer profile mark goes with the catalog-profile mechanism (Batch 3); the root's tint stays data-tint, which
  // personalization.css maps onto the tint-* utilities.
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
      const value = previous.get(key);
      if (value === undefined) delete root.dataset[key];
      else root.dataset[key] = value;
    }
    if (previousScale) root.style.setProperty("--text-scale", previousScale);
    else root.style.removeProperty("--text-scale");
  };
}
