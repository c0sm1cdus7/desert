// One witness of ArtworkPlaceholder per media kind.
import type { CatalogSpecimen } from "../../types.d.ts";

export const ArtworkPlaceholderSpecimens = [
  { state: "default", variants: { kind: "video" }, props: { kind: "video" } },
  { state: "default", variants: { kind: "audio" }, props: { kind: "audio" } },
] as const satisfies readonly CatalogSpecimen<"artwork-placeholder">[];
