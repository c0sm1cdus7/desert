// Law (plan §15, step 7.4): an asset object is written through the same derived change set as any object
// (src/storage/change-set.ts), as the SDK's own module, inside the caller's transaction: created ready when its bytes are
// processed (with one rendition object per policy width, in the policy's order), attached with the owning object's write.
// Every read re-checks the record against the asset object's declaration. Raises ASSET_NOT_READY, CORRUPT_OBJECT,
// NOT_FOUND and the change set's codes.
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { loadDefinition } from "../compiled-definition.ts";
import type { Application } from "../local/program.ts";
import { emitObject } from "../schema.ts";
import { applyChangesIn, maxChangesPerAction, type Change, type ModuleStorage } from "../storage/change-set.ts";
import type { ObjectStorage, StoredObject } from "../storage/ddl.ts";
import { readObjects, type ObjectRecord } from "../storage/object-store.ts";
import { namingViolations } from "../storage/violations.ts";
import { createShapeValidator } from "../validation.ts";
import { isMediaType, renditionMediaType, renditionWidths, renditionsOf, type MediaType, type RenditionWidth } from "../media/rendition-policy.ts";
import { assetObject, assetObjectId, optionalAssetFacts } from "./object.ts";
import type { AssetFile, PrivateAssetMetadata } from "./types.ts";

export const assetModuleId = "desert.assets";
// A file and its renditions are written by one action: the policy may not derive more renditions than one action changes.
if (renditionWidths.length + 1 > maxChangesPerAction) throw new Error("STORAGE_DECLARATION: an image's renditions exceed one action's changes");
type Program = Readonly<{ application: Application; storage: ObjectStorage }>;
/** A stored file as the read path needs it: the original, and each rendition with the width its position names. */
export type AttachedFile = Readonly<{ record: ObjectRecord; mediaType: string; original: AssetFile;
  renditions: readonly Readonly<AssetFile & { edge: RenditionWidth }>[] }>;

const validators = new WeakMap<Application, (value: unknown) => { valid: boolean }>();
function validator(application: Application) {
  let validate = validators.get(application);
  if (!validate) {
    const definition = assetObject(loadDefinition(application).objects);
    if (!definition) throw new Error("PRIVATE_IMAGE_STORAGE_NOT_INSTALLED");
    const schema = emitObject(definition);
    validate = createShapeValidator({ ...schema, required: schema.required.filter(fact => !optionalAssetFacts.has(fact)) });
    validators.set(application, validate);
  }
  return validate;
}
function assets(program: Program): StoredObject {
  return program.storage.asset ?? (() => { throw new Error("PRIVATE_IMAGE_STORAGE_NOT_INSTALLED"); })();
}
const module = (asset: StoredObject): ModuleStorage => ({ id: assetModuleId, objects: new Map([[assetObjectId, asset]]) });

/** The asset objects of `ids` that `owner` owns, each re-checked against the declaration. */
async function owned(client: PoolClient, program: Program, owner: string, ids: readonly string[], lock = false) {
  const records = await readObjects(client, assets(program), { ids, owner, lock });
  for (const record of records) if (!validator(program.application)(record.facts).valid) throw new Error("CORRUPT_OBJECT");
  return records;
}

/** Writes the processed file `reference` and its renditions as ready asset objects owned by `owner`. */
export async function createAssetObjects(client: PoolClient, program: Program, owner: string, reference: string, metadata: PrivateAssetMetadata) {
  const expected = renditionsOf(metadata.mediaType);
  if (metadata.renditions.length !== expected.length || metadata.renditions.some((item, index) => item.edge !== expected[index])) {
    throw new Error("ASSET_INTEGRITY_FAILED");
  }
  const renditions = metadata.renditions.map((item): Change => ({ kind: "create", object: assetObjectId, id: randomUUID(), facts: {
    mediaType: renditionMediaType, size: item.size, digest: item.digest, width: item.width, height: item.height,
    renditions: [], state: "ready", owner } }));
  const measured = "width" in metadata && metadata.width !== undefined && metadata.height !== undefined
    ? { width: metadata.width, height: metadata.height } : {};
  const timed = "duration" in metadata ? { duration: Math.max(1, Math.round(metadata.duration * 1000)) } : {};
  const original: Change = { kind: "create", object: assetObjectId, id: reference, facts: {
    mediaType: metadata.mediaType, size: metadata.original.size, digest: metadata.original.digest, ...measured, ...timed,
    renditions: renditions.map(change => change.id), state: "ready", owner } };
  await namingViolations(() => applyChangesIn(client, module(assets(program)), [...renditions, original]));
}

/** The file `reference` and its renditions, owned by `owner`, in `state`; NOT_FOUND for any other identity's file. */
async function file(client: PoolClient, program: Program, owner: string, reference: string, state: "ready" | "attached", lock = false) {
  const [record] = await owned(client, program, owner, [reference], lock);
  if (!record) throw new Error("NOT_FOUND");
  if (record.facts.state !== state) throw new Error(state === "ready" ? "ASSET_NOT_READY" : "NOT_FOUND");
  const ids = record.facts.renditions as readonly string[];
  const found = new Map((ids.length ? await owned(client, program, owner, ids, lock) : []).map(item => [item.id, item]));
  const renditions = ids.map(id => found.get(id) ?? (() => { throw new Error("CORRUPT_OBJECT"); })());
  if (renditions.some(item => item.facts.state !== state)) throw new Error("CORRUPT_OBJECT");
  return { record, renditions };
}

/** Attaches the ready file `reference` and its renditions in the owning object's transaction. */
export async function attachAssetObjects(client: PoolClient, program: Program, owner: string, reference: string) {
  const { record, renditions } = await file(client, program, owner, reference, "ready", true);
  const changes = [...renditions, record].map((item): Change =>
    ({ kind: "update", object: assetObjectId, id: item.id, expectedVersion: item.version, set: { state: "attached" } }));
  await namingViolations(() => applyChangesIn(client, module(assets(program)), changes));
}

/** An attached file of `owner`, as the read path serves it. */
export async function attachedFile(client: PoolClient, program: Program, owner: string, reference: string): Promise<AttachedFile> {
  const { record, renditions } = await file(client, program, owner, reference, "attached");
  const mediaType = record.facts.mediaType;
  if (!isMediaType(mediaType)) throw new Error("CORRUPT_OBJECT");
  const widths = renditionsOf(mediaType);
  if (widths.length !== renditions.length) throw new Error("CORRUPT_OBJECT");
  const bytes = (item: ObjectRecord) => ({ size: item.facts.size as number, digest: item.facts.digest as string });
  return Object.freeze({ record, mediaType, original: bytes(record),
    renditions: renditions.map((item, index) => Object.freeze({ ...bytes(item), edge: widths[index]! })) });
}
