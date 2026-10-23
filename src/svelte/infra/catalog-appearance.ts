import { mountAppearancePreferences } from "./appearance-state.ts";

/** Catalog-owned appearance lifecycle. Render adapters do not mutate the root. */
export function mountCatalogAppearance(): () => void {
  const root = document.documentElement;
  const previous = root.dataset.rendererProfile;
  root.dataset.rendererProfile = "apple-reference";
  const unmountPreferences = mountAppearancePreferences();
  return () => {
    unmountPreferences();
    if (previous === undefined) delete root.dataset.rendererProfile;
    else root.dataset.rendererProfile = previous;
  };
}
