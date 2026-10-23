import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { imageAssetLimits, assetReservationBytes,privateMediaTypes } from "../assets/policy.ts";
export {privateMediaTypes} from "../assets/policy.ts";
import { FileMetadataSchema, fileNode, type FileMetadata, type ControlEvent, type FileNode } from "./control-nodes.ts";
import type { Draft } from "./draft.ts";

export const ImageFileSelectionSchema = Type.Object({ kind: Type.Literal("image-file"), file: FileMetadataSchema },
  { additionalProperties: false });
export type ImageFileSelection = Readonly<Static<typeof ImageFileSelectionSchema>>;
export type FileInputEvent = Extract<ControlEvent, { kind: "files.choose" | "files.remove" }>;
export const isImageFileSelection = (value: unknown): value is ImageFileSelection => Check(ImageFileSelectionSchema, value);

export function assetInputMedia(schema:unknown):"image"|"media" {
  if(!schema||typeof schema!=="object"||!("properties" in schema)||!schema.properties||typeof schema.properties!=="object"
    ||!("media" in schema.properties)||!schema.properties.media||typeof schema.properties.media!=="object") return "image";
  const media=schema.properties.media;
  const values="enum" in media?media.enum:undefined;
  return Array.isArray(values)&&values.length===3&&["image","video","audio"].every(value=>values.includes(value))?"media":"image";
}
export function imageInputControl(name: string, label: string, files: readonly FileMetadata[], disabled = false, media:"image"|"media"="image") {
  return fileNode({ version: "desert.control/1", kind: "files", id: name, label, disabled,
    limits: { maxCount: 1, maxFileBytes: imageAssetLimits.originalBytes, maxTotalBytes: imageAssetLimits.originalBytes,
      accept: media==="media"?[...privateMediaTypes]:["image/jpeg", "image/png", "image/webp"] }, files });
}
export function requireImageSelection(value: ImageFileSelection,media:"image"|"media"="image") {
  imageInputControl("image", "Image", [value.file],false,media);
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
