import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { fileLimits, assetReservationBytes } from "../assets/policy.ts";
import { imageMediaTypes, mediaKindOf, mediaTypes, type MediaType } from "../media/rendition-policy.ts";
import { FileMetadataSchema, fileNode, type FileMetadata, type ControlEvent, type FileNode } from "./control-nodes.ts";
import type { Draft } from "./draft.ts";

export const ImageFileSelectionSchema = Type.Object({ kind: Type.Literal("image-file"), file: FileMetadataSchema },
  { additionalProperties: false });
export type ImageFileSelection = Readonly<Static<typeof ImageFileSelectionSchema>>;
export type FileInputEvent = Extract<ControlEvent, { kind: "files.choose" | "files.remove" }>;
export const isImageFileSelection = (value: unknown): value is ImageFileSelection => Check(ImageFileSelectionSchema, value);

/** The media types a file input offers the chooser, read from its input schema: every policy type of the media kinds the
 * value may name (an image-only fact's schema names none). The controller re-checks the fact's exact accept list and
 * maxBytes on the bytes (src/assets/file-processing.ts), so this is a convenience, never authority. */
export function assetInputMedia(schema: unknown): readonly MediaType[] {
  if (!schema || typeof schema !== "object" || !("properties" in schema) || !schema.properties || typeof schema.properties !== "object"
    || !("media" in schema.properties) || !schema.properties.media || typeof schema.properties.media !== "object") return imageMediaTypes;
  const values = "enum" in schema.properties.media ? schema.properties.media.enum : undefined;
  if (!Array.isArray(values)) return imageMediaTypes;
  const offered = mediaTypes.filter(type => values.includes(mediaKindOf(type)));
  return offered.length ? offered : imageMediaTypes;
}
export function imageInputControl(name: string, label: string, files: readonly FileMetadata[], disabled = false,
  accept: readonly MediaType[] = imageMediaTypes) {
  return fileNode({ version: "desert.control/1", kind: "files", id: name, label, disabled,
    limits: { maxCount: 1, maxFileBytes: fileLimits.maxBytes, maxTotalBytes: fileLimits.maxBytes, accept: [...accept] }, files });
}
export function requireImageSelection(value: ImageFileSelection, accept: readonly MediaType[] = imageMediaTypes) {
  imageInputControl("image", "Image", [value.file], false, accept);
  assetReservationBytes(value.file.size);
  return value;
}

/** Browser handles belong to the host session, never the draft, frame, or wire. */
export type DraftFileHost = Readonly<{
  resolve(id: string): File | undefined; release(id: string): void;
  pick?: (node: FileNode) => Promise<Extract<ControlEvent, { kind: "files.choose" }> | null>;
}>;
export function releaseDraftFiles(draft: Readonly<Draft>, host?: DraftFileHost) {
  for (const value of Object.values(draft)) if (isImageFileSelection(value)) host?.release(value.file.id);
}
