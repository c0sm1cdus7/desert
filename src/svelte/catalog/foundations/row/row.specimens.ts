// One witness of Row per state × interaction × trailing: destination rows with a face, a record row with its attention
// dot and metadata, a media list item, an attention row with its description, and rows that only read.
import type { CatalogSpecimen } from "../../types.d.ts";

export const RowSpecimens = [
  { state: "available", variants: { interaction: "open", trailing: "chevron" }, props: { label: "Notes", leading: { kind: "face", face: { kind: "icon", icon: "catalog" } },
    trailing: "chevron", interaction: "open", available: true, current: false, focusKey: "destination:notes" } },
  { state: "available", variants: { interaction: "open", trailing: "none" }, props: { label: "Harbour at dawn",
    leading: { kind: "image", source: "/bank-image.svg", alt: "Harbour at dawn", fit: "fill" }, trailing: "none", interaction: "open", available: true, current: false } },
  { state: "available", variants: { interaction: "static", trailing: "chevron" }, props: { label: "Requires your attention",
    leading: { kind: "attention", required: true }, trailing: "chevron", interaction: "static", available: true, current: false } },
  { state: "available", variants: { interaction: "static", trailing: "none" }, props: { label: "Interview", description: "No cover artwork yet",
    leading: { kind: "artwork", media: "audio" }, trailing: "none", interaction: "static", available: true, current: false } },
  { state: "unavailable", variants: { interaction: "open", trailing: "chevron" }, props: { label: "Archive", leading: { kind: "face", face: { kind: "icon", icon: "archive" } },
    trailing: "chevron", interaction: "open", available: false, reason: "Archive opens once a note is saved.", current: false } },
  { state: "unavailable", variants: { interaction: "open", trailing: "none" }, props: { label: "Weekly review", description: "Resumes when you are online",
    leading: { kind: "attention", required: true }, trailing: "none", interaction: "open", available: false, reason: "Offline", current: false } },
  { state: "current", variants: { interaction: "open", trailing: "chevron" }, props: { label: "iPhone ideas", metadata: ["Status · Draft", "Owner · Ana"],
    leading: { kind: "attention", required: false }, trailing: "chevron", interaction: "open", available: true, current: true, focusKey: "record:1" } },
  { state: "current", variants: { interaction: "open", trailing: "none" }, props: { label: "Night ferry", leading: { kind: "artwork", media: "video" },
    trailing: "none", interaction: "open", available: true, current: true } },
] as const satisfies readonly CatalogSpecimen<"row">[];
