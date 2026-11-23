import { chmodSync, linkSync, mkdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { meant } from "../fields/phrases.ts";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, it, vi } from "vitest";
import { home, open, sale, watch } from "../../tests/support/storage-rig.ts";
import { contender } from "../../tests/support/storage-process.ts";
import { journalTexts } from "../texts/journal.texts.ts";
import { WriterLeaseUnavailable } from "./writer-lease.ts";

it("rejects SQLITE_FULL during the real sidecar write, releases and permits a subsequent process", async () => {
  const root = home();
  const file = join(root, "journal.sqlite");
  const exec: unknown = Reflect.get(DatabaseSync.prototype, "exec");
  if (typeof exec !== "function") throw new Error("Missing SQLite exec");
  const limited = vi.spyOn(DatabaseSync.prototype, "exec").mockImplementation(function (this: DatabaseSync, sql) {
    if (sql === journalTexts.writerLeaseSql) Reflect.apply(exec, this, ["pragma max_page_count = 1"]);
    Reflect.apply(exec, this, [sql]);
  });
  try {
    let failure: unknown;
    try {
      open(file);
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(WriterLeaseUnavailable);
    if (!(failure instanceof Error)) throw new Error("Missing failure");
    expect(failure.cause).toMatchObject({ errcode: 13 });
  } finally {
    limited.mockRestore();
  }
  const child = contender(file, root, "after-full");
  try {
    expect(await child.next()).toBe("ready");
    child.send("open");
    expect(await child.next()).toBe("opened");
    child.send("write");
    expect(await child.next()).toBe("wrote");
  } finally {
    await child.stop();
  }
  expect(watch(open(file), "after-full")()).toHaveLength(101);
});

it.each(["wal", "off", "memory"])("takes a real writer lock even if the old sidecar used %s", async mode => {
  const root = home();
  const file = join(root, "journal.sqlite");
  const db = new DatabaseSync(`${file}.writer.sqlite`);
  db.exec(`create table older (id); pragma journal_mode = ${mode}`);
  db.close();
  const owner = open(file);
  watch(owner);
  const child = contender(file, root, mode);
  try {
    expect(await child.next()).toBe("ready");
    child.send("open");
    expect(await child.next()).toBe(meant(journalTexts.locked));
    expect(owner.append(sale("owned"), 0).seq).toBe(1);
  } finally {
    await child.stop(true);
  }
});

it("keeps exclusion after permissions change while open, then refuses to acquire read-only", async () => {
  const root = home();
  const file = join(root, "journal.sqlite");
  const owner = open(file);
  watch(owner);
  chmodSync(`${file}.writer.sqlite`, 0o400);
  const child = contender(file, root, "readonly");
  try {
    expect(await child.next()).toBe("ready");
    child.send("open");
    expect(await child.next()).not.toBe("opened");
    expect(owner.append(sale("owned"), 0).seq).toBe(1);
    owner.close();
    expect(() => open(file)).toThrow(WriterLeaseUnavailable);
  } finally {
    await child.stop(true);
    chmodSync(`${file}.writer.sqlite`, 0o600);
  }
});

it.each(["directory", "dangling", "corrupt"])("fails closed for a %s sidecar", mode => {
  const file = join(home(), "journal.sqlite");
  const sidecar = `${file}.writer.sqlite`;
  if (mode === "directory") mkdirSync(sidecar);
  else if (mode === "dangling") symlinkSync(join(home(), "absent"), sidecar);
  else writeFileSync(sidecar, "not a database");
  expect(() => open(file)).toThrow(WriterLeaseUnavailable);
  rmSync(sidecar, { recursive: true, force: true });
  open(file).close();
});

it.each(["replace", "symlink", "hardlink"])(
  "detects a %s after SQLite acquires but before opening the journal",
  mode => {
    const root = home();
    const file = join(root, "journal.sqlite");
    const sidecar = `${file}.writer.sqlite`;
    const exec: unknown = Reflect.get(DatabaseSync.prototype, "exec");
    if (typeof exec !== "function") throw new Error("Missing SQLite exec");
    const changed = vi.spyOn(DatabaseSync.prototype, "exec").mockImplementation(function (this: DatabaseSync, sql) {
      Reflect.apply(exec, this, [sql]);
      if (sql !== journalTexts.writerLeaseSql) return;
      renameSync(sidecar, `${sidecar}.old`);
      if (mode === "replace") writeFileSync(sidecar, "");
      else if (mode === "symlink") symlinkSync(`${sidecar}.old`, sidecar);
      else {
        linkSync(`${sidecar}.old`, sidecar);
      }
    });
    try {
      expect(() => open(file)).toThrow(expect.objectContaining({ code: "WRITER_LEASE_LOST" }));
    } finally {
      changed.mockRestore();
    }
  },
);

it("closing a lost owner cannot unlock its successor in another process", async () => {
  const root = home();
  const file = join(root, "journal.sqlite");
  const owner = open(file);
  watch(owner);
  owner.append(sale("before"), 0);
  renameSync(`${file}.writer.sqlite`, `${file}.writer.sqlite.old`);
  const successor = contender(file, root, "successor");
  const third = contender(file, root, "third");
  try {
    expect(await successor.next()).toBe("ready");
    expect(await third.next()).toBe("ready");
    successor.send("open");
    expect(await successor.next()).toBe("opened");
    expect(() => owner.close()).toThrow(expect.objectContaining({ code: "WRITER_LEASE_LOST" }));
    third.send("open");
    expect(await third.next()).toBe(meant(journalTexts.locked));
    successor.send("write");
    expect(await successor.next()).toBe("wrote");
  } finally {
    await successor.stop();
    await third.stop(true);
  }
  expect(watch(open(file), "new-reader")()).toHaveLength(102);
});

it("refuses a read-only directory even when a writable rollback journal already exists", () => {
  const root = home();
  const file = join(root, "journal.sqlite");
  const sidecar = `${file}.writer.sqlite`;
  const db = new DatabaseSync(sidecar);
  db.exec("create table writer (id integer primary key, nonce blob); insert into writer values (1, zeroblob(32))");
  db.close();
  writeFileSync(`${sidecar}-journal`, Buffer.alloc(8192));
  chmodSync(root, 0o500);
  try {
    expect(() => open(file)).toThrow(WriterLeaseUnavailable);
  } finally {
    chmodSync(root, 0o700);
  }
});
