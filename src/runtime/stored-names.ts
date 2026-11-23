// Rewrites, once and after a backup, what journals stored under Spanish names and gives identities their language.
import { meant } from "../fields/phrases.ts";
import { existsSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { isDeepStrictEqual } from "node:util";
import { Type } from "@sinclair/typebox";
import { isRecord } from "../fields/json-values.ts";
import { emptyHouse, houseStep, unspoken, type House } from "../house/members.ts";
import { effect, layerOf } from "../house/facts.ts";
import { vocabulary, type Foreign, type Vocabulary } from "../journal/vocabulary.ts";
import { spendingAccountFold } from "./minds/model-spending-account.ts";
import { storedNamesTexts } from "../texts/stored-names.texts.ts";
import { derivedId, readFact } from "../storage/journal-record.ts";
import { storageIdentity } from "../storage/storage-identity.ts";
import { writerLease } from "../storage/writer-lease.ts";

/** Every stored value this migration renames: where it sits (fact kind and field) and its English name. */
export const storedNames = Object.freeze({
  door: new Map([["agente", "agent"]]),
  effect: new Map([
    ["frena", "block"],
    ["requiere-supervisor", "require-supervisor"],
  ]),
});
/** A journal of a house, folded into the house, or a model account, folded into its balance. */
export type StoredJournal = "house" | "account";
export type MigrationResult = Readonly<{ rows: number; changed: number; spoken: number; backup: string | undefined }>;
/** The language an identity of a journal from before 23/11 gets: what it has seen the house in so far. */
export const formerLanguage = "es";
type Row = Readonly<Record<string, unknown>>;

const renamed = (names: ReadonlyMap<string, string>, value: unknown): unknown =>
  typeof value === "string" ? (names.get(value) ?? value) : value;
/** What a person asked of the core keeps its door or rule effect as they chose it: an open act may run again. */
function actInput(object: string, input: Readonly<Record<string, unknown>>): unknown {
  if (object.startsWith("identities/") && "door" in input)
    return { ...input, door: renamed(storedNames.door, input.door) };
  if (object === "rules" && "effect" in input) return { ...input, effect: renamed(storedNames.effect, input.effect) };
  return input;
}
/** The data a row would hold under the English names, or undefined when it already holds them. */
export function renamedData(kind: string, data: unknown): unknown {
  if (!isRecord(data)) return undefined;
  let next: unknown = data;
  if (kind === "door-key-issued" || kind === "door-invitation-issued")
    next = { ...data, door: renamed(storedNames.door, data.door) };
  if (kind === "rule-versioned" && isRecord(data.definition))
    next = { ...data, definition: { ...data.definition, effect: renamed(storedNames.effect, data.definition.effect) } };
  if (kind === "act" && isRecord(data.input)) next = { ...data, input: actInput(String(data.object), data.input) };
  if (kind === "rule-evaluated" && Array.isArray(data.results))
    next = {
      ...data,
      results: data.results.map((result: unknown) =>
        isRecord(result) ? { ...result, outcome: renamed(storedNames.effect, result.outcome) } : result,
      ),
    };
  return isDeepStrictEqual(next, data) ? undefined : next;
}

const rowsOf = (db: DatabaseSync): Row[] => db.prepare("select * from events order by seq").all();
const dataOf = (row: Row): unknown => JSON.parse(String(row.data));
function migratedRow(row: Row): Row {
  const data = renamedData(String(row.kind), dataOf(row));
  return data === undefined ? row : { ...row, data: JSON.stringify(data) };
}
/** The current house vocabulary, carrying each program kind the journal holds whole and unread. */
function houseWords(rows: readonly Row[]): Vocabulary<Foreign> {
  const kinds = [...new Set(rows.map(row => String(row.kind)))].filter(kind => layerOf(kind) === "program");
  return vocabulary(Object.fromEntries(kinds.map(kind => [kind, Type.Unknown()])));
}
/** Who administers a house says, after the fact, the language each identity it never gave one has read it in. */
function spokenRows(journal: StoredJournal, rows: readonly Row[], at: number): Row[] {
  if (journal !== "house") return [];
  const house = foldedHouse(rows);
  const seq = rows.reduce((last, row) => Math.max(last, Number(row.seq)), 0);
  const earlier = rows.filter(row => row.kind === "language-set" && row.by === house.admin && row.cause === "[]");
  return unspoken(house).map((identity, index) => {
    const fact = effect("language-set", { identity, language: formerLanguage }, house.admin);
    const id = derivedId(fact, earlier.length + index);
    const { kind, by, cause, data } = fact;
    return { seq: seq + index + 1, id, at, kind, by, cause: JSON.stringify(cause), data: JSON.stringify(data) };
  });
}
/** Every row read by the current, strict reader and folded: no name it cannot read survives the check. */
function folded(journal: StoredJournal, rows: readonly Row[]): unknown {
  if (journal === "account") {
    const { words, initial, step } = spendingAccountFold;
    let account = initial;
    for (const row of rows) account = step(account, readFact(words, row));
    return account;
  }
  return foldedHouse(rows);
}
function foldedHouse(rows: readonly Row[]): House {
  const words = houseWords(rows);
  let house = emptyHouse;
  for (const row of rows) house = houseStep(house, readFact(words, row));
  return house;
}

/** The backup folder must exist on every run; the copy in it must not, when there is something to write. */
function backupFolder(folder: string | undefined): string {
  if (!folder || !existsSync(folder) || !statSync(folder).isDirectory())
    throw new Error(meant(storedNamesTexts.backupRequired));
  return folder;
}
function backupFile(folder: string, file: string): string {
  const target = join(folder, basename(file));
  if (existsSync(target)) throw new Error(meant(storedNamesTexts.backupExists(target)));
  return target;
}
/** Rewrites the changed rows inside one transaction; append-only holds again before anything commits. */
function rewrite(db: DatabaseSync, changed: readonly Row[], added: readonly Row[]): void {
  if (changed.length) renameRows(db, changed);
  const insert = db.prepare("insert into events values (?, ?, ?, ?, ?, ?, ?, ?)");
  for (const { seq, id, at, kind, by, cause, data } of added)
    insert.run(Number(seq), String(id), Number(at), String(kind), String(by), String(cause), String(data), null);
}
/** Only an append-only journal of DESERT is rewritten, and it is append-only again before anything commits. */
function renameRows(db: DatabaseSync, changed: readonly Row[]): void {
  const trigger = db
    .prepare("select sql from sqlite_master where type = 'trigger' and name = ?")
    .get("events_no_update");
  if (typeof trigger?.sql !== "string") throw new Error(meant(storedNamesTexts.notJournal));
  db.exec("drop trigger events_no_update");
  const update = db.prepare("update events set data = ? where seq = ?");
  for (const row of changed) update.run(String(row.data), Number(row.seq));
  db.exec(trigger.sql);
}
function check(journal: StoredJournal, db: DatabaseSync, expected: unknown): void {
  const rows = rowsOf(db);
  if (rows.some(row => renamedData(String(row.kind), dataOf(row)) !== undefined))
    throw new Error(meant(storedNamesTexts.namesLeft));
  if (spokenRows(journal, rows, 0).length) throw new Error(meant(storedNamesTexts.languagesLeft));
  if (!isDeepStrictEqual(folded(journal, rows), expected)) throw new Error(meant(storedNamesTexts.foldChanged));
}

/** Migrates one journal in place: refuses without a backup folder, writes the backup, rewrites, and checks. */
export function migrateStoredNames(
  file: string,
  journal: StoredJournal,
  backups: string | undefined,
  at = Date.now(),
): MigrationResult {
  const canonical = storageIdentity(file);
  const folder = backupFolder(backups);
  const lease = writerLease(canonical);
  const db = new DatabaseSync(canonical);
  try {
    lease.check();
    const rows = rowsOf(db);
    const migrated = rows.map(migratedRow);
    const changed = migrated.filter((row, index) => row !== rows[index]);
    const added = spokenRows(journal, migrated, at);
    // The state the names fold to, read as the earlier reader read them: through the English names, in memory.
    const expected = folded(journal, [...migrated, ...added]);
    if (!changed.length && !added.length) {
      check(journal, db, expected);
      return { rows: rows.length, changed: 0, spoken: 0, backup: undefined };
    }
    const target = backupFile(folder, canonical);
    db.prepare("vacuum into ?").run(target);
    db.exec("begin immediate");
    try {
      rewrite(db, changed, added);
      check(journal, db, expected);
      lease.check();
      db.exec("commit");
    } catch (error) {
      db.exec("rollback");
      throw error;
    }
    return { rows: rows.length, changed: changed.length, spoken: added.length, backup: target };
  } finally {
    db.close();
    lease.release();
  }
}
/** After the commit, a fresh read-only connection checks the journal on disk once more. */
export function checkStoredNames(file: string, journal: StoredJournal): number {
  const db = new DatabaseSync(storageIdentity(file), { readOnly: true });
  try {
    const rows = rowsOf(db);
    const migrated = rows.map(migratedRow);
    check(journal, db, folded(journal, [...migrated, ...spokenRows(journal, migrated, 0)]));
    return rows.length;
  } finally {
    db.close();
  }
}
