// One witness per tone × size.
import type { CatalogSpecimen } from "../../types.d.ts";

export const StatusSpecimens = [
  { state: "default", variants: { tone: "neutral", size: "regular" }, props: { title: "Nothing here yet.", description: "Use \u201cNew note\u201d to get started.", tone: "neutral", size: "regular", heading: true, icon: "search" } },
  { state: "default", variants: { tone: "neutral", size: "compact" }, props: { title: "Nothing here yet.", description: "Use \u201cNew note\u201d to get started.", tone: "neutral", size: "compact", heading: true } },
  { state: "default", variants: { tone: "offline", size: "regular" }, props: { title: "Controller unavailable.", description: "Reconnect to load this content.", tone: "offline", size: "regular", heading: true } },
  { state: "default", variants: { tone: "offline", size: "compact" }, props: { title: "Controller unavailable.", description: "Reconnect to load this content.", tone: "offline", size: "compact", heading: true } },
  { state: "default", variants: { tone: "note", size: "regular" }, props: { title: "Execution adapter required", description: "This specimen needs the local execution adapter.", tone: "note", size: "regular", heading: false, icon: "info" } },
  { state: "default", variants: { tone: "note", size: "compact" }, props: { title: "Execution adapter required", description: "This specimen needs the local execution adapter.", tone: "note", size: "compact", heading: false, icon: "info", label: "Specimen unavailable" } },
  { state: "default", variants: { tone: "neutral", size: "prompt" }, props: { title: "Search in Notes", description: "Find content in this destination.", tone: "neutral", size: "prompt", heading: true, icon: "search" } },
  { state: "default", variants: { tone: "offline", size: "prompt" }, props: { title: "Search unavailable", description: "Reconnect to search this destination.", tone: "offline", size: "prompt", heading: true, icon: "search" } },
  { state: "default", variants: { tone: "note", size: "prompt" }, props: { title: "Search in Notes", description: "Results stay in this preview.", tone: "note", size: "prompt", heading: true, icon: "search" } },
] as const satisfies readonly CatalogSpecimen<"status">[];
