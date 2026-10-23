import type { ViewHeader } from "./schema.ts";

/** The executable View header currently admits images, never unbound video. */
export function viewHeaderImages(media: NonNullable<ViewHeader["media"]>) {
  if (media.kind === "video") throw new Error("UNSUPPORTED_PROGRAM_HEADER_MEDIA");
  const images = media.kind === "gallery" ? media.images : [media];
  if (new Set(images.map(image => image.asset)).size !== images.length) {
    throw new Error("DUPLICATE_VIEW_HEADER_IMAGE");
  }
  return images;
}
