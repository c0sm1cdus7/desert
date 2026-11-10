// Snapshots only accelerate pure projection replay; removing them preserves every state.
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SqliteJournal } from "../adapters/storage/journal-store.ts";
import { effect } from "./events.ts";
import { clockStep, type Deadlines } from "./clock.ts";
import { snapshotEvery } from "../catalogs/levers.ts";
import { shop, type ShopEvent, type ShopFact } from "../../tests/support/shop.ts";

type ShopJournal = SqliteJournal<ShopFact>;
const homes: string[] = [];
const journals: ShopJournal[] = [];
const open = (file: string) => {
  const journal = new SqliteJournal(file, shop);
  journals.push(journal);
  return journal;
};
const file = () => {
  const home = mkdtempSync(join(tmpdir(), "desert-snapshot-"));
  homes.push(home);
  return join(home, "journal.sqlite");
};
afterEach(() => {
  journals.splice(0).forEach(journal => journal.close());
  homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true }));
});
const boot = effect("boot", {}, "test");
const sale = shop.fact("sale-registered", { sale: "s1", total: 10 }, "ana");
/** What a program keeps of its own facts: the total sold. */
const sold = (total: number, event: ShopEvent): number =>
  event.kind === "sale-registered" ? total + event.data.total : total;
function restored<S>(journal: ShopJournal, name: string, initial: S, reduce: (state: S, event: ShopEvent) => S): S {
  const read = journal.watch(name, initial, reduce);
  journal.restore();
  return read();
}

describe("journal snapshots", () => {
  it("writes every N events and on close, then folds only the tail for each projection", () => {
    const path = file();
    const first = open(path);
    first.watch("sold", 0, sold);
    first.watch<Deadlines>("clock", new Map(), clockStep);
    for (let count = 0; count < snapshotEvery; count++) first.append(count % 2 ? sale : boot, count);
    const db = new DatabaseSync(path);
    try {
      expect(db.prepare("select count(*) as n from snapshots").get()?.n).toBe(2);
      // A copy of the open house's files simulates a crash restart before the first handle's close snapshot.
      first.append(effect("wake-at", { id: "later", at: 1_000 }, "ana"), 100);
      const crashed = file();
      cpSync(dirname(path), dirname(crashed), { recursive: true });
      const second = open(crashed);
      const soldFold = vi.fn(sold);
      const clockFold = vi.fn(clockStep);
      const total = second.watch("sold", 0, soldFold);
      const deadlines = second.watch<Deadlines>("clock", new Map(), clockFold);
      second.restore();
      expect(total()).toBe((snapshotEvery / 2) * 10);
      expect(deadlines()).toEqual(first.replay<Deadlines>(new Map(), clockStep));
      expect(soldFold).toHaveBeenCalledTimes(1);
      expect(clockFold).toHaveBeenCalledTimes(1);
      second.close();
      first.close();
      const third = open(path);
      const fold = vi.fn(sold);
      expect(restored(third, "sold", 0, fold)).toBe((snapshotEvery / 2) * 10);
      expect(fold).not.toHaveBeenCalled();
      third.close();
      db.exec("delete from snapshots");
      const fourth = open(path);
      const full = vi.fn(sold);
      expect(restored(fourth, "sold", 0, full)).toBe((snapshotEvery / 2) * 10);
      expect(full).toHaveBeenCalledTimes(snapshotEvery + 1);
    } finally {
      db.close();
    }
  });
});

describe("snapshot recovery", () => {
  it("discards damaged bytes, keeps Maps and Sets, and rejects malformed tail events", () => {
    const path = file();
    const journal = open(path);
    const reduce = (state: ReadonlySet<string>, event: ShopEvent): ReadonlySet<string> => new Set([...state, event.id]);
    journal.watch<ReadonlySet<string>>("set", new Set(), reduce);
    journal.append(boot, 0);
    journal.append(sale, 0);
    journal.close();
    const db = new DatabaseSync(path);
    try {
      db.prepare("update snapshots set state = ?").run(new Uint8Array([0, 1, 2]));
      const recovered = open(path);
      expect(restored(recovered, "set", new Set<string>(), reduce)).toEqual(
        recovered.replay<ReadonlySet<string>>(new Set(), reduce),
      );
      recovered.close();
      db.prepare("insert into events (seq, id, at, kind, by, cause, data) values (?, ?, ?, ?, ?, ?, ?)").run(
        3,
        "invalid",
        1,
        "old.boot",
        "test",
        "[]",
        "{}",
      );
      expect(() => restored(open(path), "set", new Set<string>(), reduce)).toThrow("unknown kind");
    } finally {
      db.close();
    }
  });
});
