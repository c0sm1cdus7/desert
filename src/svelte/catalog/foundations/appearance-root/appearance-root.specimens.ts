// The one witness of AppearanceRoot: it draws nothing and applies the stored appearance to the page while mounted.
import type { CatalogSpecimen } from "../../types.d.ts";

export const AppearanceRootSpecimens = [
  { state: "default", props: {} },
] as const satisfies readonly CatalogSpecimen<"appearance-root">[];
