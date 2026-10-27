// Law (plan §15, step 7.2): the SQL that reads and writes a product's objects is derived from its generated tables
// (src/storage/ddl.ts); runtime code never writes object SQL. Identifiers come quoted from the declaration, every value
// travels as a parameter, and Postgres enforces the declaration again on each write (constraint names: ddl.ts).
// Text compares and orders under the column's generated collation (owner answer Q20): no statement here names another.
import type { QueryConfig } from "pg";
import type { StoredObject, StoredReference } from "./ddl.ts";
import { qualified, quoted, quotedList } from "./render-checks.ts";

type Statement = QueryConfig<unknown[]>;
/** Which rows of one object type: by id, by a list of ids, or all of them; then optionally the owner's and equal columns. */
export type ObjectMatch = Readonly<{ id?: string; ids?: readonly string[]; owner?: string; where?: readonly (readonly [string, unknown])[]; lock?: boolean }>;

const fail = (what: string): never => { throw new Error(`STORAGE_QUERY: ${what}; contract: src/storage/object-sql.ts`); };
const selected = (object: StoredObject) => quotedList(["id", "version", ...object.columns]);

/** One object type's rows in id order (a stable order no language changes), each with its version and scalar columns. */
export function selectObjects(object: StoredObject, match: ObjectMatch): Statement {
  if (match.id !== undefined && match.ids !== undefined) fail(`${object.id}: an id and a list of ids`);
  const values: unknown[] = [], conditions: string[] = [];
  const equal = (column: string, value: unknown) => { values.push(value); conditions.push(`${quoted(column)} = $${values.length}`); };
  if (match.id !== undefined) equal("id", match.id);
  if (match.ids !== undefined) { values.push(match.ids); conditions.push(`"id" = ANY($${values.length}::uuid[])`); }
  if (match.owner !== undefined) equal(object.owner ?? fail(`${object.id} declares no owner`), match.owner);
  for (const [column, value] of match.where ?? []) {
    if (!object.columns.includes(column)) fail(`${object.id}: ${column} is not a scalar column`);
    equal(column, value);
  }
  const filter = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
  return { text: `SELECT ${selected(object)} FROM ${qualified(object.table)}${filter} ORDER BY "id"${match.lock ? " FOR UPDATE" : ""}`, values };
}

/** Locks one object and reads its version: the first statement of an update. */
export const lockObject = (object: StoredObject, id: string): Statement =>
  ({ text: `SELECT "version" FROM ${qualified(object.table)} WHERE "id" = $1 FOR UPDATE`, values: [id] });

export function insertObject(object: StoredObject, id: string, columns: readonly (readonly [string, unknown])[]): Statement {
  const names = quotedList(["id", "version", ...columns.map(([name]) => name)]);
  const slots = ["$1", "$2", ...columns.map((_, index) => `$${index + 3}`)].join(", ");
  return { text: `INSERT INTO ${qualified(object.table)} (${names}) VALUES (${slots})`, values: [id, 1, ...columns.map(([, value]) => value)] };
}

/** Sets the columns and the next version when the stored version is still the expected one; RETURNING the new version. */
export function updateObject(object: StoredObject, id: string, expectedVersion: number, columns: readonly (readonly [string, unknown])[]): Statement {
  const assignments = [...columns.map(([name], index) => `${quoted(name)} = $${index + 3}`), `"version" = "version" + 1`].join(", ");
  return { text: `UPDATE ${qualified(object.table)} SET ${assignments} WHERE "id" = $1 AND "version" = $2 RETURNING "version"`,
    values: [id, expectedVersion, ...columns.map(([, value]) => value)] };
}

/** The referenced ids of many objects, each object's in its authored order. */
export const selectReferences = (reference: StoredReference, ids: readonly string[]): Statement => ({
  text: `SELECT "object_id", "target_id" FROM ${qualified(reference.table)} WHERE "object_id" = ANY($1::uuid[]) ORDER BY "object_id", "position"`,
  values: [ids] });

export const clearReferences = (reference: StoredReference, id: string): Statement =>
  ({ text: `DELETE FROM ${qualified(reference.table)} WHERE "object_id" = $1`, values: [id] });

/** One row per referenced id, positions 0..n-1 in the given order; the generated limit trigger counts them. */
export const insertReferences = (reference: StoredReference, id: string, targets: readonly string[]): Statement => ({
  text: `INSERT INTO ${qualified(reference.table)} ("object_id", "target_id", "position")
    SELECT $1, item.target, item.ordinality - 1 FROM unnest($2::uuid[]) WITH ORDINALITY AS item(target, ordinality)`,
  values: [id, targets] });