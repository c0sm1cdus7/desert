// Law: a product's objects are read from their generated tables only (one table per object type, one join table per
// reference fact), through the statements src/storage/object-sql.ts derives from the declaration.
import type { PoolClient } from "pg";
import type { Facts } from "../fact-values.ts";
import type { ObjectStorage, StoredObject } from "./ddl.ts";
import { selectObjects, selectReferences, type ObjectMatch } from "./object-sql.ts";
import { mediaFiles, objectFacts, type ObjectRow } from "./object-values.ts";

/** One stored object as the runtime sees it: its type, version and every declared fact. */
export type ObjectRecord = { id: string; object_type: string; version: number; facts: Facts };
type Queryable = Pick<PoolClient, "query">;
/** Equal facts a read filters on, by fact name; each must be a scalar fact. */
export type FactFilter = Readonly<Record<string, string | number>>;

const fail = (what: string): never => { throw new Error(`STORAGE_QUERY: ${what}; contract: src/storage/object-store.ts`); };

export function storedObject(storage: ObjectStorage, type: string): StoredObject {
  return storage.objects.find(object => object.id === type) ?? fail(`${type} is not an object of ${storage.productId}`);
}

export async function readObjects(client: Queryable, object: StoredObject,
  match: Omit<ObjectMatch, "where"> & Readonly<{ where?: FactFilter }>): Promise<ObjectRecord[]> {
  const where = Object.entries(match.where ?? {}).map(([fact, value]) =>
    [object.facts[fact] ?? fail(`${object.id}: ${fact} is not a scalar fact`), value] as const);
  const { rows } = await client.query<ObjectRow>(selectObjects(object, { ...match, where }));
  if (!rows.length) return [];
  const ids = rows.map(row => row.id);
  const references = new Map<string, Map<string, string[]>>();
  for (const reference of object.references) {
    const targets = new Map<string, string[]>();
    const { rows: joined } = await client.query<{ object_id: string; target_id: string }>(selectReferences(reference, ids));
    for (const row of joined) targets.set(row.object_id, [...targets.get(row.object_id) ?? [], row.target_id]);
    references.set(reference.fact, targets);
  }
  const media = mediaFiles(object, rows), files = object.assets;
  const assets = new Map<string, string>(media.length && files
    ? (await client.query<ObjectRow>(selectObjects(files, { ids: [...new Set(media)] }))).rows
      .map(row => [row.id, String(row[files.facts.mediaType ?? fail(`${files.id} has no mediaType`)])])
    : []);
  return rows.map(row => ({ id: row.id, object_type: object.id, version: row.version, facts: objectFacts(object, row, { references, assets }) }));
}

/** Every stored object of a product in id order (uuid order is the order of its lower-case text): what a test compares. */
export async function readAllObjects(client: Queryable, storage: ObjectStorage): Promise<ObjectRecord[]> {
  const records: ObjectRecord[] = [];
  for (const object of storage.objects) records.push(...await readObjects(client, object, {}));
  return records.sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
}
