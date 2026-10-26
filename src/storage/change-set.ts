// Law (owner answer Q3; slice 9 plan D9-13): one action makes 1 to 8 changes, all to objects of ONE module, applied in
// their declared order inside one transaction with one receipt: all of them and the receipt, or none. The SQL is derived
// from the generated tables; values travel as parameters and Postgres enforces the declaration again (named violations).
// Raises EFFECT_LIMIT, EFFECT_FOREIGN_OBJECT, EFFECT_DUPLICATE_TARGET, EFFECT_UNKNOWN_FACT, CREATE_ASSIGNMENT_MISSING,
// NOT_FOUND and VERSION_CONFLICT; a Postgres violation is rethrown unchanged after the rollback.
import type { Pool, PoolClient } from "pg";
import type { ObjectStorage, StoredObject } from "./ddl.ts";
import { qualified, quoted } from "./render-checks.ts";

export const maxChangesPerAction = 8;
export type ModuleStorage = Readonly<{ id: string; objects: ReadonlyMap<string, StoredObject> }>;
type Facts = Readonly<Record<string, unknown>>;
export type Change =
  | Readonly<{ kind: "create"; object: string; id: string; facts: Facts }>
  | Readonly<{ kind: "update"; object: string; id: string; expectedVersion: number; set: Facts }>;
export type ChangedObject = Readonly<{ id: string; type: string; version: number; change: "created" | "updated" }>;
export type ChangeReceipt = Readonly<{ objects: readonly ChangedObject[] }>;
/** Writes the action's one receipt inside the same transaction as its changes. */
export type RecordReceipt = (client: PoolClient, receipt: ChangeReceipt) => Promise<void>;

const fail = (code: string, what: string): never => { throw new Error(`${code}: ${what}; contract: src/storage/change-set.ts`); };

/** The objects one module owns, from a product's storage. */
export function moduleStorage(storage: ObjectStorage, id: string, objectIds: readonly string[]): ModuleStorage {
  const objects = new Map(objectIds.map(objectId =>
    [objectId, storage.objects.find(object => object.id === objectId) ?? fail("EFFECT_FOREIGN_OBJECT", `module ${id}: ${objectId} is not an object of ${storage.productId}`)] as const));
  return Object.freeze({ id, objects });
}

function columnsOf(object: StoredObject, facts: Facts, where: string): [string, unknown][] {
  return Object.entries(facts).map(([fact, value]) =>
    [object.facts[fact] ?? fail("EFFECT_UNKNOWN_FACT", `${where}: ${fact} is not a scalar fact of ${object.id}`), value]);
}

/** Every check that needs no database, before any write. */
function admit(module: ModuleStorage, changes: readonly Change[]): readonly StoredObject[] {
  if (changes.length < 1 || changes.length > maxChangesPerAction) fail("EFFECT_LIMIT", `${changes.length} changes; an action makes 1 to ${maxChangesPerAction}`);
  const targets = new Set<string>();
  return changes.map((change, index) => {
    const where = `change ${index + 1} (${change.kind} ${change.object})`;
    const object = module.objects.get(change.object) ?? fail("EFFECT_FOREIGN_OBJECT", `${where}: not an object of module ${module.id}`);
    if (targets.has(`${change.object}/${change.id}`)) fail("EFFECT_DUPLICATE_TARGET", `${where}: ${change.id} is already changed by this action`);
    targets.add(`${change.object}/${change.id}`);
    const assigned = columnsOf(object, change.kind === "create" ? change.facts : change.set, where).map(([name]) => name);
    if (change.kind === "update" && assigned.length === 0) fail("EFFECT_UNKNOWN_FACT", `${where}: sets no fact`);
    const missing = change.kind === "create" ? object.columns.filter(name => !assigned.includes(name)) : [];
    if (missing.length) fail("CREATE_ASSIGNMENT_MISSING", `${where}: ${missing.join(", ")} not assigned`);
    return object;
  });
}

async function apply(client: PoolClient, object: StoredObject, change: Change): Promise<ChangedObject> {
  const table = qualified(object.table);
  if (change.kind === "create") {
    const columns = columnsOf(object, change.facts, change.id);
    const names = ["id", "version", ...columns.map(([name]) => name)].map(quoted).join(", ");
    const values = columns.map((_, index) => `$${index + 3}`).join(", ");
    await client.query(`INSERT INTO ${table} (${names}) VALUES ($1, $2, ${values})`, [change.id, 1, ...columns.map(([, value]) => value)]);
    return { id: change.id, type: object.id, version: 1, change: "created" };
  }
  const columns = columnsOf(object, change.set, change.id);
  const assignments = columns.map(([name], index) => `${quoted(name)} = $${index + 3}`).join(", ");
  const { rows } = await client.query<{ version: number }>(`UPDATE ${table} SET ${assignments}, "version" = "version" + 1
    WHERE "id" = $1 AND "version" = $2 RETURNING "version"`, [change.id, change.expectedVersion, ...columns.map(([, value]) => value)]);
  const version = rows[0]?.version ?? fail("VERSION_CONFLICT", `${object.id} ${change.id} changed after version ${change.expectedVersion}`);
  return { id: change.id, type: object.id, version, change: "updated" };
}

/** Locks every updated object in canonical order (object type, then id), so two actions never wait on each other in a cycle. */
async function lock(client: PoolClient, module: ModuleStorage, changes: readonly Change[]) {
  const updates = changes.filter(change => change.kind === "update")
    .sort((left, right) => left.object === right.object ? (left.id < right.id ? -1 : 1) : (left.object < right.object ? -1 : 1));
  for (const change of updates) {
    const object = module.objects.get(change.object) ?? fail("EFFECT_FOREIGN_OBJECT", change.object);
    const { rows } = await client.query<{ version: number }>(`SELECT "version" FROM ${qualified(object.table)} WHERE "id" = $1 FOR UPDATE`, [change.id]);
    const version = rows[0]?.version ?? fail("NOT_FOUND", `${change.object} ${change.id}`);
    if (version !== change.expectedVersion) fail("VERSION_CONFLICT", `${change.object} ${change.id} is at version ${version}, not ${change.expectedVersion}`);
  }
}

export async function applyChanges(pool: Pool, module: ModuleStorage, changes: readonly Change[], record: RecordReceipt): Promise<ChangeReceipt> {
  const objects = admit(module, changes);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await lock(client, module, changes);
    const changed: ChangedObject[] = [];
    for (const [index, change] of changes.entries()) changed.push(await apply(client, objects[index] ?? fail("EFFECT_LIMIT", String(index)), change));
    const receipt = Object.freeze({ objects: Object.freeze(changed) });
    await record(client, receipt);
    await client.query("COMMIT");
    client.release();
    return receipt;
  } catch (error) {
    // The original failure is the result; a connection that cannot roll back is destroyed, never reused.
    await client.query("ROLLBACK").then(() => client.release(), (rollback: unknown) => client.release(rollback instanceof Error ? rollback : true));
    throw error;
  }
}
