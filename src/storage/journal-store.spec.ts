// SQLite round trips preserve envelopes, reducer results and causal identity; one open journal per house.
import { meant } from "../fields/phrases.ts";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { effect } from "../house/facts.ts";
import { clockStep, type Deadlines } from "../journal/clock.ts";
import { derivedId, journalReader, SqliteJournal } from "./journal-store.ts";
import { journalTexts } from "../texts/journal.texts.ts";
import { shop, type ShopEvent, type ShopFact } from "../../tests/support/shop.ts";

type ShopJournal = SqliteJournal<ShopFact>;
const homes: string[] = [];
const opened: { close(): void }[] = [];
const home = () => {
  const path = mkdtempSync(join(tmpdir(), "desert-journal-"));
  homes.push(path);
  return path;
};
const open = (file: string) => {
  const journal = new SqliteJournal(file, shop);
  opened.push(journal);
  return journal;
};
afterEach(() => {
  opened
    .splice(0)
    .reverse()
    .forEach(resource => resource.close());
  homes.splice(0).forEach(path => rmSync(path, { recursive: true, force: true }));
});
const all = (journal: ShopJournal) => journal.replay<ShopEvent[]>([], (events, event) => [...events, event]);
const boot = effect("boot", {}, "main");
const insert = "insert into events (seq, id, at, kind, by, cause, data) values (?, ?, ?, ?, ?, ?, ?)";

const history = (journal: ShopJournal): ShopEvent[] => {
  const first = journal.append(boot, 100);
  const wake = journal.append(effect("wake-at", { id: "turn", at: 200 }, "ana", [first.id]), 100);
  const woke = journal.append(effect("woke", { id: "turn" }, "clock", [wake.id]), 200);
  journal.append(shop.fact("sale-registered", { sale: "s1", total: 1500 }, "ana", [woke.id]), 200);
  journal.append(effect("wake-at", { id: "next", at: 300 }, "ana", [woke.id]), 200);
  return all(journal);
};

describe("journal", () => {
  it("replays the same envelopes and pure reducer state from the beginning after reopening", () => {
    const file = join(home(), "journal.sqlite");
    const journal = new SqliteJournal(file, shop);
    const events = history(journal);
    const state = journal.replay<Deadlines>(new Map(), clockStep);
    journal.close();
    const reopened = open(file);
    expect(all(reopened)).toEqual(events);
    expect(all(reopened).map(event => event.seq)).toEqual([1, 2, 3, 4, 5]);
    expect(all(reopened).map(event => event.layer)).toEqual(["house", "house", "house", "program", "house"]);
    expect(reopened.replay<Deadlines>(new Map(), clockStep)).toEqual(state);
    expect(reopened.append(boot, 300).seq).toBe(6);
    expect(statSync(file).mode & 0o777).toBe(0o600);
  });

  it("keeps a fact's layer out of its row: the kind says whose it is", () => {
    const file = join(home(), "journal.sqlite");
    const journal = open(file);
    history(journal);
    const db = new DatabaseSync(file, { readOnly: true });
    opened.push(db);
    expect(Object.keys(db.prepare("select * from events where seq = 4").get() ?? {})).toEqual(
      expect.not.arrayContaining(["layer"]),
    );
    const reader = journalReader(file, shop);
    opened.push(reader);
    expect(reader.since(3).map(event => [event.layer, event.kind])).toEqual([
      ["program", "sale-registered"],
      ["house", "wake-at"],
    ]);
  });

  it("derives identical histories and ids in independent fresh houses", () => {
    const first = open(":memory:");
    const second = open(":memory:");
    expect(history(first)).toEqual(history(second));
    expect(derivedId(boot, 1)).toBe(derivedId(boot, 1));
    expect(derivedId({ ...boot, cause: ["different"] }, 1)).not.toBe(derivedId(boot, 1));
    expect(derivedId({ ...boot, by: "different" }, 1)).not.toBe(derivedId(boot, 1));
    expect(derivedId(boot, 2)).not.toBe(derivedId(boot, 1));
  });

  it("keeps an effect's identity when unrelated events are interleaved", () => {
    const first = open(":memory:");
    const second = open(":memory:");
    const fact = shop.fact("payment-received", { payment: "p1", amount: 10 }, "bank", ["transfer"]);
    first.append(boot, 100);
    second.append(boot, 100);
    second.append(boot, 200);
    const direct = first.append(fact, 300);
    const interleaved = second.append(fact, 300);
    expect(interleaved.seq).not.toBe(direct.seq);
    expect(interleaved.id).toBe(direct.id);
    expect(first.append(fact, 300).id).not.toBe(direct.id);
  });

  it.each(["old.boot", "not-declared"])("rejects persisted unknown kind %s instead of skipping it", kind => {
    const file = join(home(), "journal.sqlite");
    const journal = open(file);
    journal.append(boot, 100);
    const db = new DatabaseSync(file);
    opened.push(db);
    db.prepare(insert).run(2, "foreign", 100, kind, "main", "[]", "{}");
    expect(() => all(journal)).toThrow(`does not read: #2 ${kind}`);
    expect(() => journal.close()).toThrow(expect.objectContaining({ code: "WRITER_LEASE_LOST" }));
  });

  it("rejects persisted invalid data of either layer and enforces append-only SQL", () => {
    const file = join(home(), "journal.sqlite");
    const journal = open(file);
    const original = journal.append(boot, 100);
    const db = new DatabaseSync(file);
    opened.push(db);
    expect(() => db.exec("update events set at = 200")).toThrow("append-only");
    expect(() => db.exec("delete from events")).toThrow("append-only");
    expect(all(journal)).toEqual([original]);
    db.prepare(insert).run(2, "bad", 100, "sale-registered", "ana", "[]", "{}");
    expect(() => all(journal)).toThrow("This house's journal holds a fact this program does not read");
    expect(() => journal.close()).toThrow(expect.objectContaining({ code: "WRITER_LEASE_LOST" }));
  });

  it("leaves neither a row nor a sequence gap when validation fails", () => {
    const journal = open(":memory:");
    expect(() => journal.append(effect("wake-at", { id: "x", at: -1 }, "ana"), 100)).toThrow(
      "Invalid event envelope or unknown kind",
    );
    expect(() => journal.append(shop.fact("sale-registered", { sale: "", total: 1 }, "ana"), 100)).toThrow(
      "Invalid event envelope or unknown kind",
    );
    expect(all(journal)).toEqual([]);
    expect(journal.append(boot, 100).seq).toBe(1);
  });
});

describe("journal lock", () => {
  const house = () => {
    const folder = home();
    return { file: join(folder, "journal.sqlite"), lock: join(folder, "journal.lock") };
  };

  it("refuses a second open of the same house until the first one closes", () => {
    const { file, lock } = house();
    const first = open(file);
    expect(existsSync(lock)).toBe(false);
    expect(() => open(file)).toThrow(meant(journalTexts.locked));
    first.close();
    expect(existsSync(lock)).toBe(false);
    expect(open(file).append(boot, 100).seq).toBe(1);
  });

  it("does not treat a live PID in an abandoned bridge as proof of ownership", () => {
    const { file, lock } = house();
    writeFileSync(lock, String(process.ppid));
    const journal = open(file);
    expect(existsSync(lock)).toBe(false);
    journal.close();
    expect(existsSync(lock)).toBe(false);
  });

  it.each([
    ["a dead process", String(spawnSync(process.execPath, ["-e", ""]).pid)],
    ["an earlier process that had this same pid", String(process.pid)],
    ["unreadable contents", "not a pid"],
  ])("takes over a stale lock left by %s", (_, holder) => {
    const { file, lock } = house();
    writeFileSync(lock, holder);
    const journal = open(file);
    expect(existsSync(lock)).toBe(false);
    journal.close();
    expect(existsSync(lock)).toBe(false);
  });

  it("ignores a legacy bridge written after ownership and never removes it on close", () => {
    const { file, lock } = house();
    const journal = open(file);
    writeFileSync(lock, String(process.ppid));
    journal.close();
    expect(existsSync(lock)).toBe(true);
  });
});
