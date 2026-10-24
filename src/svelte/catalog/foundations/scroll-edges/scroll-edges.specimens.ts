// The one witness of ScrollEdges: before its viewport and owner are mounted it draws no fade.
import type { CatalogSpecimen } from "../../types.d.ts";

export const ScrollEdgesSpecimens = [
  { state: "default", props: { viewport: null, owner: null } },
] as const satisfies readonly CatalogSpecimen<"scroll-edges">[];
