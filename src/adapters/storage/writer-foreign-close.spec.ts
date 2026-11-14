// Reproductions of doors.mjs and doors2.mjs: a foreign descriptor in the owner's process releases POSIX locks.
import { copyFileSync, cpSync, readFileSync, statSync, truncateSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { home, open, sale, watch } from "../../../tests/support/storage-rig.ts";
import { contender } from "../../../tests/support/storage-process.ts";
import { WriterLeaseLost } from "./writer-lease.ts";

it.each(["read", "copy", "truncate", "folder"])(
  "poisons the owner after a foreign %s and another writer",
  async mode => {
    const root = home();
    const file = join(root, "journal.sqlite");
    const owner = open(file);
    const state = watch(owner);
    owner.append(sale("before"), 0);
    const sidecar = `${file}.writer.sqlite`;
    if (mode === "read") readFileSync(sidecar);
    if (mode === "copy") copyFileSync(sidecar, join(home(), "copy.sqlite"));
    if (mode === "truncate") truncateSync(sidecar, 0);
    if (mode === "folder") cpSync(root, join(home(), "copy"), { recursive: true });
    const child = contender(file, root, "successor");
    try {
      expect(await child.next()).toBe("ready");
      child.send("open");
      expect(await child.next()).toBe("opened");
      child.send("write");
      expect(await child.next()).toBe("wrote");
      const before = owner.replay<string[]>([], (all, e) => [...all, e.id]);
      expect(() => owner.append(sale("forbidden"), 1)).toThrow(WriterLeaseLost);
      expect(state()).toEqual(["before"]);
      expect(owner.replay<string[]>([], (all, e) => [...all, e.id])).toEqual(before);
      expect(() => owner.append(sale("retry"), 2)).toThrow(WriterLeaseLost);
      expect(() => owner.close()).toThrow(WriterLeaseLost);
    } finally {
      await child.stop();
    }
  },
);
it("creates a sidecar for its owner only without tightening an existing file", () => {
  const file = join(home(), "journal.sqlite");
  const owner = open(file);
  expect(statSync(`${file}.writer.sqlite`).mode & 0o777).toBe(0o600);
  owner.close();
});

it("names lost exclusion when the successor is still inside a write transaction", async () => {
  const root = home();
  const file = join(root, "journal.sqlite");
  const owner = open(file);
  watch(owner);
  readFileSync(`${file}.writer.sqlite`);
  const child = contender(file, root, "writing");
  try {
    expect(await child.next()).toBe("ready");
    child.send("open");
    expect(await child.next()).toBe("opened");
    child.send("begin");
    expect(await child.next()).toBe("writing");
    expect(() => owner.append(sale("forbidden"), 0)).toThrow(WriterLeaseLost);
    expect(() => owner.close()).toThrow(WriterLeaseLost);
  } finally {
    await child.stop();
  }
});
