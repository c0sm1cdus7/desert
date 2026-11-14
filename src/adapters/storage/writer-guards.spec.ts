vi.mock("node:fs", { spy: true });
import * as fs from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, it, vi } from "vitest";
import { home, open, sale, watch } from "../../../tests/support/storage-rig.ts";
import { shop } from "../../../tests/support/shop.ts";
import { writerLease, WriterLeaseLost } from "./writer-lease.ts";
it("detects a reused inode with a different birth instant and remains lost after the metadata returns", () => {
  const file = join(home(), "journal.sqlite");
  const lease = writerLease(file);
  const changed = fs.lstatSync(`${file}.writer.sqlite`, { bigint: true });
  changed.birthtimeNs += 1n;
  const stat = vi.spyOn(fs, "lstatSync").mockReturnValue(changed);
  try {
    expect(lease.check).toThrow(WriterLeaseLost);
  } finally {
    stat.mockRestore();
    lease.release();
  }
  expect(lease.check).toThrow(WriterLeaseLost);
});
it("rejects a check after the SQLite lease connection closes", () => {
  const lease = writerLease(join(home(), "journal.sqlite"));
  lease.release();
  expect(lease.check).toThrow(WriterLeaseLost);
});
it("checks again after vocabulary decoding and before preparing an insert", () => {
  const file = join(home(), "journal.sqlite");
  const owner = open(file);
  watch(owner);
  const prepare = vi.spyOn(DatabaseSync.prototype, "prepare");
  const original = shop.read;
  const decode = vi.spyOn(shop, "read").mockImplementation(value => {
    const event = original(value);
    fs.renameSync(`${file}.writer.sqlite`, `${file}.gone`);
    return event;
  });
  try {
    expect(() => owner.append(sale("lost"), 0)).toThrow(WriterLeaseLost);
    expect(prepare.mock.calls.filter(([sql]) => sql.startsWith("insert into events"))).toEqual([]);
  } finally {
    prepare.mockRestore();
    decode.mockRestore();
  }
  expect(() => owner.close()).toThrow(WriterLeaseLost);
});
