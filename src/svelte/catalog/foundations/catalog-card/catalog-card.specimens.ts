// One witness of CatalogCard per artwork state: an item with its image, and a video item without one.
import type { CatalogSpecimen } from "../../types.d.ts";

export const CatalogCardSpecimens = [
  { state: "image", props: { node: { version: "desert.bank-node/1", kind: "catalog.card", presentation: "item", record: "harbor-at-dawn",
    title: "Harbor at dawn", image: { asset: "harbor-at-dawn-cover", alt: "Fishing boats moored in a calm harbor at sunrise" } } } },
  { state: "placeholder", props: { node: { version: "desert.bank-node/1", kind: "catalog.card", presentation: "item", record: "night-ferry",
    title: "Night ferry", mediaType: "video" } } },
] as const satisfies readonly CatalogSpecimen<"catalog-card">[];
