import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { deserialize, serialize } from "node:v8";
import { expect, it, vi } from "vitest";
import { home, open, sale, watch, fold } from "../../../tests/support/storage-rig.ts";

const seed = (name: string, count = 1) => {
  const file = join(home(), "journal.sqlite");
  const journal = open(file);
  watch(journal);
  for (let n = 0; n < count; n++) journal.append(sale(`${name}${n}`), n);
  journal.close();
  return file;
};
const saved = (file: string): Uint8Array => {
  const db = new DatabaseSync(file);
  try {
    const bytes = db.prepare("select state from snapshots where name = 'sales'").get()?.state;
    if (!(bytes instanceof Uint8Array)) throw new Error("Missing saved fold");
    return bytes;
  } finally {
    db.close();
  }
};
const put = (file: string, bytes: Uint8Array) => {
  const db = new DatabaseSync(file);
  try {
    db.prepare("update snapshots set state = ?").run(bytes);
  } finally {
    db.close();
  }
};

it.each([1, 2])("rejects another journal’s fold at or behind its sequence (%s)", count => {
  const a = seed("a", count);
  const b = seed("b");
  put(a, saved(b));
  expect(watch(open(a))()).toEqual(Array.from({ length: count }, (_, n) => `a${n}`));
});

it.each([
  ["old or unsupported format version", { version: 2 }],
  ["old or unsupported format version", { version: 999 }],
  ["invalid or ahead sequence", { seq: 99 }],
  ["different calculation version", { identity: "changed" }],
  ["different journal identity", { journal: "another" }],
  ["truncated or unreadable format", null],
])("warns when discarding %s, rebuilds once and then reuses the saved fold", (reason, change) => {
  const file = seed("a");
  const bytes = saved(file);
  const value: unknown = deserialize(bytes);
  if (typeof value !== "object" || value === null) throw new Error("Invalid fixture");
  put(file, change ? serialize({ ...value, ...change }) : bytes.subarray(0, 4));
  const warning = vi.spyOn(process, "emitWarning").mockImplementation(() => {});
  try {
    const current = open(file);
    expect(watch(current)()).toEqual(["a0"]);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining(`sales discarded: ${reason}`), expect.any(Object));
    current.close();
    warning.mockClear();
    const next = open(file);
    const reduce = vi.fn(fold);
    const state = next.watch<readonly string[]>("sales", [], reduce);
    next.restore();
    expect(state()).toEqual(["a0"]);
    expect(reduce).not.toHaveBeenCalled();
    expect(warning).not.toHaveBeenCalled();
  } finally {
    warning.mockRestore();
  }
});
