// Each context, plain and with its media: a place heading over a featured image, and an embedded heading over a
// background image.
import type { CatalogSpecimen } from "../../types.d.ts";

export const PlaceHeadingSpecimens = [
  { state: "default", variants: { context: "place" }, props: { context: "place", title: "Places", subtitle: "Explore places." } },
  { state: "media", variants: { context: "place" }, props: { context: "place", title: "Lake", subtitle: "A quiet shore.",
    media: { kind: "image", asset: "bank-image.svg", alt: "A lake at dawn" } } },
  { state: "default", variants: { context: "embedded" }, props: { context: "embedded", title: "Component bank",
    subtitle: "Interactive examples. Changes stay here; no product commands are executed." } },
  { state: "media", variants: { context: "embedded" }, props: { context: "embedded", title: "Atlas", subtitle: "Maps of every place.",
    background: { asset: "bank-image.svg", alt: "A map" } } },
] as const satisfies readonly CatalogSpecimen<"place-heading">[];
