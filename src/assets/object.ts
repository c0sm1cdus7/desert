// Law (plan §15, step 7.4): every stored file is an object. The SDK declares one object type, `asset`, in each product that
// declares a file fact; its typed table is generated like any object's (src/storage/ddl.ts) and a file fact's column is a
// foreign key to it. An asset object is written when its bytes are processed (state ready, owned by the uploader) and is
// attached in the same transaction that writes the owning object (src/assets/acceptance.ts). Before that, the reservation
// and the transfer live in the staging ledger (desert_assets, states reserved, uploading, failed), because a file's media
// type and digest do not exist until its bytes do. Raises STORAGE_DECLARATION.
import type { ObjectDefinition } from "../contracts.ts";
import { enumeration, integer, principal, text, type FieldDefinition } from "../field-definition.ts";
import { imageInputPixelLimit, mediaTypes, policyOrder, renditionMediaType, renditionWidths, renditionsOf, type MediaType }
  from "../media/rendition-policy.ts";
import { fileLimits } from "./policy.ts";

export const assetObjectId = "asset";
export const assetStates = ["ready", "attached"] as const;
/** Facts an asset may lack: an image has width and height, a video also a duration, audio only a duration. */
export const optionalAssetFacts: ReadonlySet<string> = new Set(["width", "height", "duration"]);
/** The default detail of any file: these facts, in this order, readable by the asset's owner wherever the owning object's
 * read journey shows the file (src/assets/read.ts assetDetail). */
export const assetDetailFacts = ["mediaType", "size", "digest", "width", "height", "duration", "state"] as const;
/** The longest playable file, in milliseconds (the unit of the `duration` fact). */
const longestDuration = 24 * 60 * 60 * 1000;

/** The media types a product's file facts accept, and the rendition type when any of them derives renditions. */
export function storedMediaTypes(objects: readonly ObjectDefinition[]): readonly MediaType[] {
  const accepted = objects.flatMap(object => Object.values(object.facts).flatMap(fact => fact.kind === "file" ? fact.accept : []));
  const renditions = accepted.some(type => renditionsOf(type).length) ? [renditionMediaType] : [];
  return policyOrder([...accepted, ...renditions].filter((type): type is MediaType => mediaTypes.includes(type as MediaType)));
}

/** The SDK's asset object for a product whose file facts store `types`; undefined when the product declares no file fact. */
export function assetObject(objects: readonly ObjectDefinition[]): ObjectDefinition | undefined {
  const types = storedMediaTypes(objects);
  const [first, ...rest] = types;
  if (first === undefined) return undefined;
  const taken = objects.find(object => object.id === assetObjectId);
  if (taken) {
    throw new Error(`STORAGE_DECLARATION: object ${assetObjectId}: the SDK declares this object for the product's file facts; ` +
      "rename the product's object; contract: src/assets/object.ts");
  }
  const measure = integer({ minimum: 1, maximum: imageInputPixelLimit });
  const facts: Record<string, FieldDefinition> = {
    mediaType: enumeration([first, ...rest]),
    size: integer({ minimum: 0, maximum: Math.max(fileLimits.maxBytes, fileLimits.renditionBytes) }),
    digest: text({ minLength: 64, maxLength: 64 }),
    width: measure, height: measure, duration: integer({ minimum: 1, maximum: longestDuration }),
    renditions: { kind: "labels", maxItems: renditionWidths.length, maxLength: 36, reference: { object: assetObjectId, label: "digest" } },
    state: enumeration([...assetStates]),
    owner: principal(),
  };
  // Canonical (sorted) facts, the order a compiled product's facts have, so its columns follow the same law.
  return { id: assetObjectId, facts: Object.fromEntries(Object.entries(facts).sort(([left], [right]) => left < right ? -1 : 1)) };
}
/** The asset object's owner fact: its ownership policy, the same law as a product policy (ownershipPolicy). */
export const assetOwnerFact = "owner";
