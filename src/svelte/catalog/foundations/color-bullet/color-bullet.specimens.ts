// The one witness of ColorBullet: a label colored rose.
import type { CatalogSpecimen } from "../../types.d.ts";

export const ColorBulletSpecimens = [
  { state: "default", props: { color: "rose" } },
] as const satisfies readonly CatalogSpecimen<"color-bullet">[];
