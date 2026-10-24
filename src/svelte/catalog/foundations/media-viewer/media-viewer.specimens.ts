// One witness of MediaViewer per state: an image set, a video and audio set, and a single image (no paging, no strip).
import type { CatalogSpecimen } from "../../types.d.ts";

export const MediaViewerSpecimens = [
  { state: "image", props: { title: "Coast", index: 0, open: true, items: [
    { kind: "image", source: "/bank-image.svg", alt: "Mountain lake" },
    { kind: "image", source: { kind: "asset", reference: "10000000-0000-4000-8000-000000000003", media: "image" }, alt: "Harbour at dusk" }] } },
  { state: "playable", props: { title: "Studio", index: 0, open: true, items: [
    { kind: "video", source: "/media/film", alt: "Motion study", captions: [{ source: "/media/captions", language: "en", label: "English" }] },
    { kind: "audio", source: "/media/audio", alt: "Silence", captions: [] }] } },
  { state: "single", props: { title: "Lake", index: 0, open: true, returnFocus: "catalog-return:lake", items: [{ kind: "image", source: "/bank-image.svg", alt: "Mountain lake" }] } },
] as const satisfies readonly CatalogSpecimen<"media-viewer">[];
