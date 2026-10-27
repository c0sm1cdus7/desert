// What a media grid shows for each record of its collection: the artwork its image fact names (a public path, a private
// image, or the placeholder of video or audio without artwork or of an unusable source), how it fits, and its text
// alternative. MediaGrid draws these as tiles or rows; nothing here touches the DOM.
import type { AssetReference } from "../../../../assets/types.ts";
import type { FactValue } from "../../../../fact-values.ts";

export type MediaArtwork = Readonly<{ kind: "image"; source: string | AssetReference }>
  | Readonly<{ kind: "placeholder"; media: "video" | "audio" | "unavailable" }>;
export type MediaGridItem = Readonly<{ id: string; artwork: MediaArtwork; fit: "fill" | "fit"; description: string | undefined }>;
export type MediaGridPresentation = Readonly<{ image: string; fit?: string; description?: string }>;
type MediaRecord = Readonly<{ id: string; facts: Readonly<Record<string, FactValue>> }>;

/** The artwork an image fact names: a same-origin path, a private asset (an image, or the placeholder of playable media). */
export function mediaArtwork(source: FactValue | undefined): MediaArtwork {
  if (typeof source === "string") return source.startsWith("/") && !source.startsWith("//") ? { kind: "image", source } : { kind: "placeholder", media: "unavailable" };
  if (typeof source !== "object" || !("reference" in source)) return { kind: "placeholder", media: "unavailable" };
  return source.media === "video" || source.media === "audio" ? { kind: "placeholder", media: source.media } : { kind: "image", source };
}

/** One item per record, in order; `description` is the record's description fact when it is non-blank text. */
export function mediaGridItems(records: readonly MediaRecord[], presentation: MediaGridPresentation): readonly MediaGridItem[] {
  return records.map(record => {
    const described = presentation.description === undefined ? undefined : record.facts[presentation.description];
    return {
      id: record.id,
      artwork: mediaArtwork(record.facts[presentation.image]),
      fit: presentation.fit !== undefined && record.facts[presentation.fit] === "fit" ? "fit" : "fill",
      description: typeof described === "string" && described.trim() ? described : undefined,
    };
  });
}
