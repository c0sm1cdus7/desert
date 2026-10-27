// Law: a file is admitted by what its bytes are, never by its name or the type a browser claims, and only when that type is
// one its fact accepts. Images get the policy's renditions (src/media/rendition-policy.ts); every other type is kept as
// uploaded. Raises UNSUPPORTED_IMAGE_ASSET (a fact that accepts only images), UNSUPPORTED_MEDIA_ASSET (bytes of no
// installed type) and UNSUPPORTED_FILE_TYPE (a recognized type the fact does not accept).
import { acceptsOnlyImages, type MediaType } from "../media/rendition-policy.ts";
import { optimizeImageBytes } from "./image-processing.ts";
import { optimizeMediaBytes } from "./media-processing.ts";
import type { PrivateAssetStore } from "./storage.ts";
import type { AssetFile, DocumentAssetMetadata, PrivateAssetMetadata } from "./types.ts";

const ascii = (bytes: Buffer, start: number, end: number) => bytes.toString("latin1", start, end);

/** A PDF: the `%PDF-x.y` header and an end-of-file marker in its last kilobyte. */
function isPdf(bytes: Buffer) {
  return /^%PDF-[12]\.\d/.test(ascii(bytes, 0, 8)) && ascii(bytes, Math.max(0, bytes.length - 1024), bytes.length).includes("%%EOF");
}
/** A ZIP: a local file header (or an empty archive), and an end-of-central-directory record that ends the file exactly and
 * points at a central directory inside it. */
function isZip(bytes: Buffer) {
  if (bytes.length < 22 || !["PK\u0003\u0004", "PK\u0005\u0006"].includes(ascii(bytes, 0, 4))) return false;
  for (let end = bytes.length - 22; end >= Math.max(0, bytes.length - 22 - 0xffff); end--) {
    if (bytes.readUInt32LE(end) !== 0x06054b50 || end + 22 + bytes.readUInt16LE(end + 20) !== bytes.length) continue;
    const size = bytes.readUInt32LE(end + 12), offset = bytes.readUInt32LE(end + 16);
    return offset + size === end && (size === 0 ? end === 0 : bytes.readUInt32LE(offset) === 0x02014b50);
  }
  return false;
}
export function inspectDocumentBytes(bytes: Uint8Array): Omit<DocumentAssetMetadata, "original" | "renditions"> | undefined {
  const data = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (isPdf(data)) return { mediaType: "application/pdf", media: "document" };
  if (isZip(data)) return { mediaType: "application/zip", media: "archive" };
  return undefined;
}

/** Processes the stored original of a file fact that accepts `accept`, in the media worker (src/assets/image-worker.ts). */
export async function processFileBytes(store: PrivateAssetStore, reference: string, original: AssetFile,
  accept: readonly MediaType[]): Promise<PrivateAssetMetadata> {
  const imagesOnly = acceptsOnlyImages(accept);
  let metadata: PrivateAssetMetadata;
  if (imagesOnly) metadata = await optimizeImageBytes(store, reference, original);
  else {
    const document = inspectDocumentBytes(await store.read(reference, "original", original));
    metadata = document ? { ...document, original, renditions: [] } : await optimizeMediaBytes(store, reference, original);
  }
  if (!accept.includes(metadata.mediaType)) throw new Error(imagesOnly ? "UNSUPPORTED_IMAGE_ASSET" : "UNSUPPORTED_FILE_TYPE");
  return metadata;
}
