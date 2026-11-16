// Failed opens and failed saves release only their own lease, and never publish half a projection group.
import { existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { serialize } from "node:v8";
import { expect, it } from "vitest";
import { journalKept } from "./journal-store.ts";
import { home, open, sale, watch } from "../../tests/support/storage-rig.ts";

it("resolves a parent alias before creating the journal, and refuses a dangling file link", () => {
  const root = home();
  const real = join(root, "real");
  mkdirSync(real);
  const alias = join(root, "alias");
  symlinkSync(real, alias, "dir");
  const writer = open(join(alias, "journal.sqlite"));
  expect(() => open(join(real, "journal.sqlite"))).toThrow("already open");
  expect(() => journalKept(join(real, "journal.sqlite"))).toThrow("already open");
  writer.close();
  const missing = join(root, "missing.sqlite");
  symlinkSync(missing, join(root, "dangling.sqlite"));
  expect(() => open(join(root, "dangling.sqlite"))).toThrow();
  expect(existsSync(missing)).toBe(false);
});

it("releases after journal construction or obsolete bridge cleanup fails", () => {
  const root = home();
  const file = join(root, "journal.sqlite");
  writeFileSync(file, "not sqlite");
  expect(() => open(file)).toThrow();
  rmSync(file);
  const lock = join(root, "journal.lock");
  mkdirSync(lock);
  expect(() => open(file)).toThrow();
  rmSync(lock, { recursive: true });
  expect(() => open(file)).not.toThrow();
});

it("a failed second snapshot write rolls back the entire group and still releases ownership", () => {
  const file = join(home(), "journal.sqlite");
  const writer = open(file);
  watch(writer, "a");
  watch(writer, "b");
  writer.append(sale("left"), 0);
  const db = new DatabaseSync(file);
  try {
    db.exec(`create trigger refuse_b before insert on snapshots when new.name = 'b'
      begin select raise(abort, 'second save failed'); end`);
    expect(() => writer.close()).toThrow("second save failed");
    expect(db.prepare("select count(*) as n from snapshots").get()?.n).toBe(0);
    db.exec("drop trigger refuse_b");
    expect(watch(open(file))()).toEqual(["left"]);
  } finally {
    db.close();
  }
});

it("failed restore and close without restore cannot overwrite the previous saved group", () => {
  const file = join(home(), "journal.sqlite");
  const first = open(file);
  watch(first);
  first.append(sale("left"), 0);
  first.close();
  const db = new DatabaseSync(file);
  try {
    const bytes = serialize({ seq: 1, state: ["wrong"] });
    db.prepare("update snapshots set state = ?").run(bytes);
    const unopened = open(file);
    unopened.watch("sales", [], () => []);
    unopened.close();
    expect(db.prepare("select state from snapshots").get()?.state).toEqual(new Uint8Array(bytes));
    const broken = open(file);
    broken.watch("sales", [], () => {
      throw new Error("broken fold");
    });
    expect(() => broken.restore()).toThrow("broken fold");
    broken.close();
    expect(db.prepare("select state from snapshots").get()?.state).toEqual(new Uint8Array(bytes));
    expect(watch(open(file))()).toEqual(["left"]);
  } finally {
    db.close();
  }
});

it("a refused contender changes neither the owner's cache nor an obsolete bridge", () => {
  const root = home();
  const file = join(root, "journal.sqlite");
  const writer = open(file);
  const state = watch(writer);
  for (let n = 0; n < 100; n++) writer.append(sale(`s${n}`), 0);
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const before = db.prepare("select * from snapshots").all();
    writeFileSync(join(root, "journal.lock"), "obsolete");
    expect(() => open(file)).toThrow("already open");
    expect(db.prepare("select * from snapshots").all()).toEqual(before);
    expect(existsSync(join(root, "journal.lock"))).toBe(true);
    writer.append(sale("tail"), 0);
    expect(state()).toHaveLength(101);
  } finally {
    db.close();
  }
});

it("a periodic snapshot failure rolls back its fact and every fold before another append", () => {
  const file = join(home(), "journal.sqlite");
  const writer = open(file);
  const state = watch(writer, "a");
  watch(writer, "b");
  for (let n = 0; n < 99; n++) writer.append(sale(`s${n}`), 0);
  const db = new DatabaseSync(file);
  try {
    db.exec(`create trigger refuse_b before insert on snapshots when new.name = 'b'
      begin select raise(abort, 'periodic save failed'); end`);
    expect(() => writer.append(sale("rejected"), 0)).toThrow("periodic save failed");
    expect(state()).toHaveLength(99);
    expect(db.prepare("select count(*) as n from events").get()?.n).toBe(99);
    expect(db.prepare("select count(*) as n from snapshots").get()?.n).toBe(0);
    db.exec("drop trigger refuse_b");
    expect(writer.append(sale("last"), 0).seq).toBe(100);
    writer.close();
    expect(watch(open(file), "a")()).toEqual(state());
  } finally {
    db.close();
  }
});
