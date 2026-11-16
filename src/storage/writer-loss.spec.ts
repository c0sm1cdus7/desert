import { copyFileSync, existsSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { WriterLeaseLost } from "./writer-lease.ts";
import { home, open, sale, watch, fold } from "../../tests/support/storage-rig.ts";

it.each(["removed", "replaced"])("refuses every write after the sidecar is %s", mode => {
  const root = home();
  const file = join(root, "journal.sqlite");
  const sidecar = `${file}.writer.sqlite`;
  const owner = open(file);
  const state = watch(owner);
  owner.append(sale("before"), 0);
  if (mode === "removed") rmSync(sidecar);
  else {
    copyFileSync(sidecar, join(root, "replacement"));
    renameSync(join(root, "replacement"), sidecar);
  }
  const next = open(file);
  const nextState = watch(next);
  next.append(sale("new owner"), 1);
  const lost = { name: "WriterLeaseLost", code: "WRITER_LEASE_LOST" };
  expect(() => owner.append(sale("forbidden"), 2)).toThrow(expect.objectContaining(lost));
  expect(() => owner.batch(() => {})).toThrow(expect.objectContaining(lost));
  expect(() => owner.restore()).toThrow(expect.objectContaining(lost));
  expect(state()).toEqual(["before"]);
  expect(owner.replay([], fold)).toEqual(["before", "new owner"]);
  // Loss stays latched even after the new owner closes; close must release resources without saving.
  next.close();
  expect(() => owner.close()).toThrow(expect.objectContaining(lost));
  expect(watch(open(file))()).toEqual(nextState());
});

it("never creates a legacy bridge and closing one of two journals does not unlink another's files", () => {
  const root = home();
  const lock = join(root, "journal.lock");
  writeFileSync(lock, "old version");
  const a = open(join(root, "a.sqlite"));
  expect(existsSync(lock)).toBe(false);
  const b = open(join(root, "b.sqlite"));
  watch(b);
  expect(existsSync(lock)).toBe(false);
  writeFileSync(lock, "left later by an old program");
  a.close();
  expect(existsSync(lock)).toBe(true);
  expect(b.append(sale("still owned"), 0).seq).toBe(1);
  b.close();
  expect(existsSync(lock)).toBe(true);
});

it("rolls back the whole batch if exclusion disappears inside its callback, before commit", () => {
  const file = join(home(), "journal.sqlite");
  const owner = open(file);
  const state = watch(owner);
  owner.append(sale("before"), 0);
  expect(() =>
    owner.batch(() => {
      owner.append(sale("rolled back"), 1);
      rmSync(`${file}.writer.sqlite`);
    }),
  ).toThrow(expect.objectContaining({ code: "WRITER_LEASE_LOST" }));
  expect(state()).toEqual(["before"]);
  expect(owner.replay([], fold)).toEqual(["before"]);
  expect(() => owner.close()).toThrow(expect.objectContaining({ code: "WRITER_LEASE_LOST" }));
  expect(watch(open(file))()).toEqual(["before"]);
});

it("refuses a write even without a successor and cannot revive a lease after the same inode returns", () => {
  const file = join(home(), "journal.sqlite");
  const sidecar = `${file}.writer.sqlite`;
  const owner = open(file);
  watch(owner);
  owner.append(sale("before"), 0);
  renameSync(sidecar, `${sidecar}.held`);
  expect(() => owner.append(sale("absent"), 1)).toThrow(WriterLeaseLost);
  renameSync(`${sidecar}.held`, sidecar);
  expect(() => owner.append(sale("returned"), 2)).toThrow(WriterLeaseLost);
  expect(owner.replay([], fold)).toEqual(["before"]);
  expect(() => owner.close()).toThrow(WriterLeaseLost);
  expect(watch(open(file))()).toEqual(["before"]);
});
