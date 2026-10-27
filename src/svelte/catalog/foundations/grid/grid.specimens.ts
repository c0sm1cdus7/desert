// One witness per track recipe.
import type { CatalogSpecimen } from "../../types.d.ts";

export const GridSpecimens = [
  { state: "default", variants: { tracks: "tiles" }, props: { tracks: "tiles", gap: "regular" } },
  { state: "default", variants: { tracks: "collections" }, props: { tracks: "collections", gap: "regular" } },
  { state: "default", variants: { tracks: "cards" }, props: { tracks: "cards", gap: "close" } },
  { state: "default", variants: { tracks: "covers" }, props: { tracks: "covers", gap: "close" } },
  { state: "default", variants: { tracks: "results" }, props: { tracks: "results", gap: "close" } },
] as const satisfies readonly CatalogSpecimen<"grid">[];
