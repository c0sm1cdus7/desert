// Law (plan §15, step 7.4): the one place that names the media types a `file` fact may accept, what kind of media each is,
// and which renditions the SDK derives from it. An image gets one webp rendition per width below (fit inside the edge,
// never enlarged); every other type is kept as uploaded, without renditions. Pure data: the browser imports it too.
export const renditionWidths = [160, 320, 640, 1280, 1920, 2560] as const;
export type RenditionWidth = (typeof renditionWidths)[number];
export const imageInputPixelLimit = 80_000_000;
/** The media type of every rendition. */
export const renditionMediaType = "image/webp";

export const mediaTypePolicy = Object.freeze({
  "image/jpeg": { media: "image", renditions: renditionWidths },
  "image/png": { media: "image", renditions: renditionWidths },
  "image/webp": { media: "image", renditions: renditionWidths },
  "video/mp4": { media: "video", renditions: [] },
  "audio/mp4": { media: "audio", renditions: [] },
  "audio/mpeg": { media: "audio", renditions: [] },
  "audio/wav": { media: "audio", renditions: [] },
  "application/pdf": { media: "document", renditions: [] },
  "application/zip": { media: "archive", renditions: [] },
} as const);
export type MediaType = keyof typeof mediaTypePolicy;
export type MediaKind = (typeof mediaTypePolicy)[MediaType]["media"];
/** Every accepted media type, in policy order (the order a file fact's enum and the asset object's mediaType list use). */
export const mediaTypes = Object.freeze(Object.keys(mediaTypePolicy) as MediaType[]);
export const mediaKinds = Object.freeze([...new Set(mediaTypes.map(type => mediaTypePolicy[type].media))]) as readonly MediaKind[];
export const imageMediaTypes = Object.freeze(mediaTypes.filter(type => mediaTypePolicy[type].media === "image"));

export const isMediaType = (value: unknown): value is MediaType => typeof value === "string" && Object.hasOwn(mediaTypePolicy, value);
export const mediaKindOf = (type: MediaType): MediaKind => mediaTypePolicy[type].media;
/** The rendition widths the SDK derives from one media type, in order; a rendition's position names its width. */
export const renditionsOf = (type: MediaType): readonly RenditionWidth[] => mediaTypePolicy[type].renditions;
/** A fact that accepts only images reads back as a bare image reference; any other names its value's media kind. */
export const acceptsOnlyImages = (accept: readonly MediaType[]) => accept.every(type => mediaKindOf(type) === "image");
/** The media kinds a list of accepted types spans, in policy order. */
export const acceptedKinds = (accept: readonly MediaType[]): readonly MediaKind[] =>
  mediaKinds.filter(kind => accept.some(type => mediaKindOf(type) === kind));
/** The accepted types in policy order, without repeats. */
export const policyOrder = (accept: readonly MediaType[]): readonly MediaType[] => mediaTypes.filter(type => accept.includes(type));
