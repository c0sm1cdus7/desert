// One witness per state × fit of Image: still loading, decoded and shown, and failed with a retry.
import type { CatalogSpecimen } from "../../types.d.ts";

export const ImageSpecimens = [
  { state: "loading", variants: { fit: "fill" },
    props: { source: { kind: "asset", reference: "10000000-0000-4000-8000-000000000003", media: "image" }, alt: "Harbour at dusk", fit: "fill" } },
  { state: "loading", variants: { fit: "fit" },
    props: { source: { kind: "asset", reference: "10000000-0000-4000-8000-000000000003", media: "image" }, alt: "Harbour at dusk", fit: "fit" } },
  { state: "ready", variants: { fit: "fill" }, props: { source: "/bank-image.svg", alt: "Mountain lake", fit: "fill" } },
  { state: "ready", variants: { fit: "fit" }, props: { source: "/bank-image.svg", alt: "Mountain lake", fit: "fit" } },
  { state: "error", variants: { fit: "fill" },
    props: { source: "/media/missing-photo.jpg", alt: "Missing photo", fit: "fill", retry: true, fallback: "Image unavailable" } },
  { state: "error", variants: { fit: "fit" },
    props: { source: "/media/missing-photo.jpg", alt: "Missing photo", fit: "fit", retry: true, fallback: "Image unavailable" } },
] as const satisfies readonly CatalogSpecimen<"image">[];
