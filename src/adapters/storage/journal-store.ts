// Append-only facts; replay folds the complete journal without publishing effects.
import { ProjectionGroup } from "../../journal/projections.ts";
import { privateFileMode, snapshotEvery } from "../../catalogs/levers.ts";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { privateDatabase } from "./home.ts";
import { DatabaseSync } from "node:sqlite";
import { layerOf, type Emission, type Event, type Foreign, type Vocabulary } from "../../journal/events.ts";
import { journalTexts } from "../../texts/journal.texts.ts";
const schema = `
  create table if not exists events (
    seq integer primary key, id text not null unique, at integer not null,
    kind text not null, by text not null, cause text not null, data text not null, process text
  );
  create table if not exists snapshots (name text primary key, state blob not null);
  create index if not exists events_cause on events (kind, by, cause);
  create trigger if not exists events_no_update before update on events begin select raise(abort, 'append-only'); end;
  create trigger if not exists events_no_delete before delete on events begin select raise(abort, 'append-only'); end;
`;
const parse = (value: unknown): unknown => {
  if (typeof value !== "string") throw new Error(journalTexts.invalidEvent);
  return JSON.parse(value);
};
/** A row holds a fact without its layer: the kind says whose it is, so a kind the house adopts later still reads. */
const factOf = ({ process, ...fact }: Readonly<Record<string, unknown>>): unknown => ({
  ...fact,
  ...(typeof process === "string" ? { process } : {}),
  layer: layerOf(String(fact.kind)),
  cause: parse(fact.cause),
  data: parse(fact.data),
});
/** A journal another process may be writing, read without its lock: the events after a sequence, oldest first. */
export function journalReader<P extends Foreign>(file: string, words: Vocabulary<P>) {
  const db = new DatabaseSync(file, { readOnly: true });
  const after = db.prepare("select * from events where seq > ? order by seq");
  return {
    since: (seq: number): Event<P>[] => after.all(seq).map(row => words.read(factOf(row))),
    close: () => db.close(),
  };
}
/** Derive identity from provenance, kind, writer and the ordinal among their effects. */
export function derivedId(emission: Emission, ordinal: number): string {
  return createHash("sha256")
    .update(JSON.stringify([emission.cause, emission.by, emission.kind, ordinal]))
    .digest("hex");
}
/** What is stored has no process when it has none, so the event folded live is the event replay will read. */
const stored = ({ process, ...fact }: Emission) => (process === undefined ? fact : { ...fact, process });
const held = new Set<string>();
const holder = (lock: string): number => (existsSync(lock) ? Number(readFileSync(lock, "utf8")) : 0);
function alive(pid: number): boolean {
  try {
    return pid > 0 && process.kill(pid, 0);
  } catch (error) {
    return error instanceof Error && "code" in error && error.code === "EPERM";
  }
}
function hold(lock: string): string {
  const pid = holder(lock);
  if (held.has(lock) || (pid !== process.pid && alive(pid))) throw new Error(journalTexts.locked);
  writeFileSync(lock, String(process.pid), { flag: existsSync(lock) ? "w" : "wx", mode: privateFileMode });
  held.add(lock);
  return lock;
}
export class SqliteJournal<P extends Foreign = Foreign> {
  private readonly db: DatabaseSync;
  private readonly words: Vocabulary<P>;
  private readonly projections = new ProjectionGroup<Event<P>>();
  private readonly lock: string | undefined;
  constructor(file: string, words: Vocabulary<P>) {
    this.words = words;
    this.db = privateDatabase(file);
    try {
      this.lock = file === ":memory:" ? undefined : hold(resolve(dirname(file), "journal.lock"));
      this.db.exec(`pragma journal_mode = wal; pragma synchronous = full; ${schema}`);
    } catch (error) {
      this.close();
      throw error;
    }
  }
  append(emission: Emission<P>, at: number): Event<P> {
    this.db.exec("begin immediate");
    let event: Event<P>;
    try {
      const position = this.db.prepare("select coalesce(max(seq), 0) + 1 as seq from events").get();
      const count = this.db
        .prepare("select count(*) as ordinal from events where kind = ? and by = ? and cause = ?")
        .get(emission.kind, emission.by, JSON.stringify(emission.cause));
      if (typeof position?.seq !== "number" || typeof count?.ordinal !== "number")
        throw new Error(journalTexts.invalidEvent);
      const id = derivedId(emission, count.ordinal);
      event = this.words.read({ ...stored(emission), seq: position.seq, id, at });
      const { seq, kind, by, cause, data, process } = event;
      this.db
        .prepare("insert into events values (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(seq, id, at, kind, by, JSON.stringify(cause), JSON.stringify(data), process ?? null);
      this.db.exec("commit");
    } catch (error) {
      this.db.exec("rollback");
      throw error;
    }
    this.projections.fold(event);
    if (event.seq % snapshotEvery === 0) this.snapshot();
    return event;
  }
  replay<S>(initial: S, reduce: (state: S, event: Event<P>) => S, after = 0): S {
    let state = initial;
    for (const row of this.db.prepare("select * from events where seq > ? order by seq").iterate(after))
      state = reduce(state, this.readRow(row));
    return state;
  }
  /** A fact this program does not read stops the house where it is found, named: it is never skipped. */
  private readRow(row: Readonly<Record<string, unknown>>): Event<P> {
    try {
      return this.words.read(factOf(row));
    } catch {
      throw new Error(journalTexts.unreadable(Number(row.seq), String(row.kind)));
    }
  }
  watch<S>(name: string, initial: S, reduce: (state: S, event: Event<P>) => S): () => S {
    const row = this.db.prepare("select state from snapshots where name = ?").get(name);
    return this.projections.add(name, initial, reduce, row?.state);
  }
  /** Brings what is watched up to the last fact. What was kept under a name nobody watches now is dropped. */
  restore(): void {
    const watched = [...this.projections.caches.keys()];
    const names = watched.map(() => "?").join(", ");
    this.db.prepare(`delete from snapshots where name not in (${names})`).run(...watched);
    this.replay(null, (_, event) => this.projections.fold(event), this.projections.after());
  }
  private snapshot(): void {
    for (const [name, projection] of this.projections.caches)
      this.db.prepare("insert or replace into snapshots values (?, ?)").run(name, projection.encode());
  }
  close(): void {
    if (!this.db.isOpen) return;
    this.snapshot();
    this.db.close();
    if (this.lock) held.delete(this.lock);
    if (this.lock && holder(this.lock) === process.pid) unlinkSync(this.lock);
  }
}
