// One witness of PlaybackCanvas per state: a captioned video, and an audio item over its placeholder artwork.
import { mediaPlayback } from "../../../infra/playback.svelte.ts";
import type { CatalogSpecimen } from "../../types.d.ts";

export const PlaybackCanvasSpecimens = [
  { state: "video", props: { playback: mediaPlayback(), item: { kind: "video", source: "/media/harbour.mp4", alt: "Harbour at dawn",
    captions: [{ source: "/media/harbour.en.vtt", language: "en", label: "English" }] } } },
  { state: "audio", props: { playback: mediaPlayback(), item: { kind: "audio", source: "/media/interview.m4a", alt: "Interview", captions: [] } } },
] as const satisfies readonly CatalogSpecimen<"playback-canvas">[];
