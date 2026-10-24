// One witness of MediaPlayer per state × presentation: a captioned video and an audio item over its placeholder artwork,
// inline, in the viewer and heading a place.
import type { CatalogSpecimen } from "../../types.d.ts";

export const MediaPlayerSpecimens = [
  { state: "video", variants: { presentation: "inline" }, props: { presentation: "inline", item: { kind: "video", source: "/media/harbour.mp4",
    alt: "Harbour at dawn", captions: [{ source: "/media/harbour.en.vtt", language: "en", label: "English" }] } } },
  { state: "video", variants: { presentation: "viewer" }, props: { presentation: "viewer", item: { kind: "video", source: "/media/harbour.mp4",
    alt: "Harbour at dawn", captions: [{ source: "/media/harbour.en.vtt", language: "en", label: "English" }] } } },
  { state: "video", variants: { presentation: "header" }, props: { presentation: "header", item: { kind: "video", source: "/media/harbour.mp4",
    alt: "Harbour at dawn", artwork: { source: "/bank-image.svg", alt: "Harbour at dawn" }, captions: [] } } },
  { state: "audio", variants: { presentation: "inline" }, props: { presentation: "inline",
    item: { kind: "audio", source: "/media/interview.m4a", alt: "Interview", captions: [] } } },
  { state: "audio", variants: { presentation: "viewer" }, props: { presentation: "viewer",
    item: { kind: "audio", source: "/media/interview.m4a", alt: "Interview", artwork: { source: "/bank-image.svg", alt: "Studio" }, captions: [] } } },
  { state: "audio", variants: { presentation: "header" }, props: { presentation: "header",
    item: { kind: "audio", source: "/media/interview.m4a", alt: "Interview", captions: [] } } },
] as const satisfies readonly CatalogSpecimen<"media-player">[];
