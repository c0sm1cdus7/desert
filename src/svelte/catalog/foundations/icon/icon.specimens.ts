// One witness per tone of Icon, in its only state: the glyphs Availability shows for ready and unavailable.
import type { CatalogSpecimen } from "../../types.d.ts";

export const IconSpecimens = [
  { state: "default", variants: { tone: "success" }, props: { name: "circle-check", tone: "success", decorative: true } },
  { state: "default", variants: { tone: "warning" }, props: { name: "circle-alert", tone: "warning", decorative: true } },
] as const satisfies readonly CatalogSpecimen<"icon">[];
