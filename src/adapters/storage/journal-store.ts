// Append-only facts; replay folds the complete journal without publishing effects.
import { ProjectionGroup } from "../../journal/projections.ts";
import { snapshotEvery } from "../../catalogs/levers.ts";
import { factOf, derivedId, stored } from "./journal-record.ts";
export { derivedId } from "./journal-record.ts";
import { storageIdentity } from "./storage-identity.ts";
import { journalIdentity } from "./journal-identity.ts";
import type { FoldWarning } from "../../journal/snapshot-format.ts";
import { snapshotWarning } from "./storage-notices.ts";
import { writerLease } from "./writer-lease.ts";
import { privateDatabase } from "./home.ts";
import { DatabaseSync } from "node:sqlite";
import type { Emission, Event, Foreign, Vocabulary } from "../../journal/events.ts";
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
/** A journal another process may be writing, read without its lock: the events after a sequence, oldest first. */
export function journalReader<P extends Foreign>(file: string, words: Vocabulary<P>) {
  const db = new DatabaseSync(storageIdentity(file), { readOnly: true });
  try {
    const after = db.prepare("select * from events where seq > ? order by seq");
    return {
      since: (seq: number): Event<P>[] => after.all(seq).map(row => words.read(factOf(row))),
      close: () => db.close(),
    };
  } catch (error) {
    db.close();
    throw error;
  }
}
export { journalKept } from "./kept-journal.ts";
export class SqliteJournal<P extends Foreign = Foreign> {
  private readonly db: DatabaseSync;
  private readonly words: Vocabulary<P>;
  private readonly projections = new ProjectionGroup<Event<P>>();
  private readonly lease: ReturnType<typeof writerLease>;
  private readonly identity: string;
  private readonly warn: (warning: FoldWarning) => void;
  private readonly warnings: FoldWarning[] = [];
  private restored = false;
  private restoreFailed = false;
  private batching = false;
  constructor(file: string, words: Vocabulary<P>, warn: (warning: FoldWarning) => void = snapshotWarning) {
    this.warn = warning => {
      this.warnings.push(warning);
      warn(warning);
    };
    this.words = words;
    const canonical = storageIdentity(file);
    this.lease = writerLease(canonical);
    let db: DatabaseSync | undefined;
    try {
      this.lease.check();
      db = privateDatabase(canonical);
      this.lease.check();
      db.exec(`pragma journal_mode = wal; pragma synchronous = full; ${schema}`);
      this.identity = journalIdentity(db, this.lease.check);
      this.db = db;
    } catch (error) {
      try {
        db?.close();
      } finally {
        this.lease.release();
      }
      throw error;
    }
  }
  restoration() {
    return {
      reused: [...this.projections.caches.values()].every(cache => cache.reused),
      warnings: [...this.warnings],
    };
  }
  /** Several facts written whole or not at all. One that does not fold is never kept: neither it nor what was
   * written with it stays, on disk or in what is folded, and whoever wrote hears why. */
  batch<T>(write: () => T): T {
    this.lease.check();
    if (this.batching) return write();
    this.db.exec("begin immediate");
    this.batching = true;
    const back = this.projections.mark();
    const restored = this.restored;
    try {
      const done = write();
      this.lease.check();
      this.db.exec("commit");
      return done;
    } catch (error) {
      this.db.exec("rollback");
      back();
      this.restored = restored;
      throw error;
    } finally {
      this.batching = false;
    }
  }
  append(emission: Emission<P>, at: number): Event<P> {
    if (!this.restored) this.restore();
    return this.batch(() => {
      const position = this.db.prepare("select coalesce(max(seq), 0) + 1 as seq from events").get();
      const count = this.db
        .prepare("select count(*) as ordinal from events where kind = ? and by = ? and cause = ?")
        .get(emission.kind, emission.by, JSON.stringify(emission.cause));
      if (typeof position?.seq !== "number" || typeof count?.ordinal !== "number")
        throw new Error(journalTexts.invalidEvent);
      const id = derivedId(emission, count.ordinal);
      const event = this.words.read({ ...stored(emission), seq: position.seq, id, at });
      const { seq, kind, by, cause, data, process } = event;
      this.lease.check();
      this.db
        .prepare("insert into events values (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(seq, id, at, kind, by, JSON.stringify(cause), JSON.stringify(data), process ?? null);
      this.projections.fold(event);
      if (event.seq % snapshotEvery === 0) this.snapshot();
      return event;
    });
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
  watch<S>(name: string, initial: S, reduce: (state: S, event: Event<P>) => S, identity = ""): () => S {
    const row = this.db.prepare("select state from snapshots where name = ?").get(name);
    this.restored = false;
    const last = this.db.prepare("select coalesce(max(seq), 0) as seq from events").get();
    return this.projections.add(name, initial, reduce, row?.state, Number(last?.seq), identity, this.identity, reason =>
      this.warn({ name, reason }),
    );
  }
  /** Brings what is watched up to the last fact. What was kept under a name nobody watches now is dropped. */
  restore(): void {
    this.restored = false;
    try {
      this.batch(() => {
        const watched = [...this.projections.caches.keys()];
        for (const row of this.db.prepare("select name from snapshots").all())
          if (typeof row.name === "string" && !watched.includes(row.name))
            this.warn({ name: row.name, reason: journalTexts.unwatchedFold });
        const names = watched.map(() => "?").join(", ");
        this.lease.check();
        this.db.prepare(`delete from snapshots where name not in (${names})`).run(...watched);
        this.replay(null, (_, event) => this.projections.fold(event), this.projections.after());
      });
    } catch (error) {
      this.restoreFailed = true;
      throw error;
    }
    this.restored = true;
  }
  private snapshot(): void {
    if (!this.restored || this.restoreFailed) return;
    this.batch(() => {
      for (const [name, projection] of this.projections.caches) {
        const bytes = projection.encode();
        this.lease.check();
        this.db.prepare("insert or replace into snapshots values (?, ?)").run(name, bytes);
      }
    });
  }
  close(): void {
    if (!this.db.isOpen) return;
    try {
      this.lease.check();
      this.snapshot();
    } finally {
      try {
        this.db.close();
      } finally {
        this.lease.release();
      }
    }
  }
}
