// Append-only facts; replay folds the complete journal without publishing effects.
import { emptyHouse, houseStep } from "../house/members.ts";
import { currentKitEmission, historicalKitEmission } from "../house/kit-emission.ts";
import { verifiedAfter, restorationOf } from "./verify-saved.ts";
import { ProjectionGroup } from "../journal/projections.ts";
import { derivedId, stored, readFact } from "./journal-record.ts";
import { storageIdentity } from "./storage-identity.ts";
import { journalIdentity } from "./journal-identity.ts";
import type { FoldWarning } from "../journal/snapshot-format.ts";
import { snapshotWarning } from "./storage-notices.ts";
import { journalPosition } from "./journal-position.ts";
import { journalTransaction } from "./journal-transaction.ts";
import { writerLease } from "./writer-lease.ts";
import { privateDatabase } from "./home.ts";
import { DatabaseSync } from "node:sqlite";
import type { Emission, Event, Foreign, Vocabulary } from "../journal/vocabulary.ts";
import { journalTexts } from "../texts/journal.texts.ts";
export { derivedId } from "./journal-record.ts";
/** The storage layout belongs to the same envelope decoded by journal-record. */
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

export { journalReader } from "./journal-reader.ts";
export { journalKept } from "./kept-journal.ts";
export class SqliteJournal<P extends Foreign = Foreign> {
  private readonly db: DatabaseSync;
  private readonly words: Vocabulary<P>;
  private readonly projections = new ProjectionGroup<Event<P>>();
  private readonly lease: ReturnType<typeof writerLease>;
  private readonly position: ReturnType<typeof journalPosition>;
  private readonly identity: string;
  private readonly warn: (warning: FoldWarning) => void;
  private readonly warnings: FoldWarning[] = [];
  private readonly folds: "restore" | "preserve";
  private restored = false;
  private restoreFailed = false;
  private batching = false;
  constructor(
    file: string,
    words: Vocabulary<P>,
    warn: (warning: FoldWarning) => void = snapshotWarning,
    folds: "restore" | "preserve" = "restore",
  ) {
    this.folds = folds;
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
      this.position = journalPosition(db, this.lease);
    } catch (error) {
      try {
        db?.close();
      } finally {
        this.lease.release();
      }
      throw error;
    }
  }
  /** Check ownership before another house store starts a write. */
  check(): void {
    this.lease.check();
  }
  restoration() {
    return restorationOf(this.projections, this.warnings);
  }
  /** Each batch restores its own rows, position and folds on failure, including nested batches. */
  batch<T>(write: () => T): T {
    this.lease.check();
    const nested = this.batching;
    const transaction = journalTransaction(this.db, this.position, nested);
    const position = this.position.mark();
    this.batching = true;
    // Each fact appended inside a batch is a nested batch: copying every fold there made a long batch quadratic.
    const back = this.projections.mark(!nested);
    const restored = this.restored;
    try {
      this.position.check();
      const done = write();
      this.lease.check();
      transaction.commit();
      return done;
    } catch (error) {
      transaction.rollback();
      position();
      back();
      this.restored = restored;
      throw error;
    } finally {
      this.batching = nested;
    }
  }
  append(emission: Emission<P>, at: number): Event<P> {
    if (!this.restored && this.folds === "restore") this.restore();
    return this.batch(() => {
      if (historicalKitEmission(emission)) emission = currentKitEmission(emission, this.replay(emptyHouse, houseStep));
      const position = this.db.prepare("select coalesce(max(seq), 0) + 1 as seq from events").get();
      const count = this.db
        .prepare("select count(*) as ordinal from events where kind = ? and by = ? and cause = ?")
        .get(emission.kind, emission.by, JSON.stringify(emission.cause));
      if (typeof position?.seq !== "number" || typeof count?.ordinal !== "number")
        throw new Error(journalTexts.invalidEvent);
      const id = derivedId(emission, count.ordinal);
      // Validate the persisted shape: protected positions already contain references, not original material.
      const event = this.words.read({ ...stored(emission), seq: position.seq, id, at });
      const { seq, kind, by, cause, data, process } = event;
      this.lease.check();
      this.db
        .prepare("insert into events values (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(seq, id, at, kind, by, JSON.stringify(cause), JSON.stringify(data), process ?? null);
      this.position.wrote(seq);
      this.projections.fold(event);
      if (event.seq % snapshotEvery === 0) this.snapshot();
      return event;
    });
  }
  replay<S>(initial: S, reduce: (state: S, event: Event<P>) => S, after = 0): S {
    let state = initial;
    for (const row of this.db.prepare("select * from events where seq > ? order by seq").iterate(after))
      state = reduce(state, readFact(this.words, row));
    return state;
  }
  watch<S>(name: string, initial: S, reduce: (state: S, event: Event<P>) => S, identity = ""): () => S {
    if (this.folds === "preserve") throw new Error("Maintenance cannot watch folds");
    const row = this.db.prepare("select state from snapshots where name = ?").get(name);
    this.restored = false;
    const last = this.db.prepare("select coalesce(max(seq), 0) as seq from events").get();
    return this.projections.add(name, initial, reduce, row?.state, Number(last?.seq), identity, this.identity, reason =>
      this.warn({ name, reason }),
    );
  }
  /** Restores watched folds; drops names outside them and the explicitly retained calculation family. */
  restore(retainPrefix = "", verify = false): void {
    if (this.folds === "preserve") throw new Error("Maintenance cannot restore folds");
    this.restored = false;
    try {
      this.batch(() => {
        const watched = [...this.projections.caches.keys()];
        for (const row of this.db.prepare("select name from snapshots").all())
          if (typeof row.name === "string" && !watched.includes(row.name)) {
            if (retainPrefix && row.name.startsWith(retainPrefix)) watched.push(row.name);
            else this.warn({ name: row.name, reason: journalTexts.unwatchedFold });
          }
        const names = watched.map(() => "?").join(", ");
        this.lease.check();
        this.db.prepare(`delete from snapshots where name not in (${names})`).run(...watched);
        this.replay(null, (_, event) => this.projections.fold(event), verifiedAfter(this.projections, this, verify));
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

export const snapshotEvery = 100;
