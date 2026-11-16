import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { unpackFixture, packFixture } from "../../tests/support/snapshot-fixture.ts";
import { expect, it, vi } from "vitest";
import { journalKept } from "./journal-store.ts";
import { home, open, sale, watch, fold } from "../../tests/support/storage-rig.ts";

const identity = (file: string) => {
  const db = new DatabaseSync(file);
  try {
    return db.prepare("select id from journal_identity").get()?.id;
  } finally {
    db.close();
  }
};
it.each(["0ec3f7b", "19a0b47"])("assigns and preserves identity on maintenance and reopening legacy %s", revision => {
  const file = join(home(), "journal.sqlite");
  copyFileSync(new URL(`../../tests/fixtures/legacy-${revision}.sqlite`, import.meta.url), file);
  journalKept(file, false);
  const first = identity(file);
  expect(first).toEqual(expect.any(String));
  open(file).close();
  expect(identity(file)).toBe(first);
  const another = join(home(), "journal.sqlite");
  open(another).close();
  expect(identity(another)).not.toBe(first);
});

it.each(["missing", "different sequence"])("also explains discarded compatible siblings (%s)", mode => {
  const file = join(home(), "journal.sqlite");
  const owner = open(file);
  watch(owner, "a");
  watch(owner, "b");
  owner.append(sale("before"), 0);
  owner.close();
  const db = new DatabaseSync(file);
  try {
    if (mode === "missing") db.exec("delete from snapshots where name = 'b'");
    else {
      const row = db.prepare("select state from snapshots where name = 'b'").get();
      if (!(row?.state instanceof Uint8Array)) throw new Error("Missing fixture");
      const value: unknown = unpackFixture(row.state);
      if (typeof value !== "object" || value === null) throw new Error("Invalid fixture");
      db.prepare("update snapshots set state = ? where name = 'b'").run(packFixture({ ...value, seq: 0, state: [] }));
    }
  } finally {
    db.close();
  }
  const warning = vi.spyOn(process, "emitWarning").mockImplementation(() => {});
  try {
    const next = open(file);
    const a = next.watch<readonly string[]>("a", [], fold);
    const b = next.watch<readonly string[]>("b", [], fold);
    next.restore();
    expect([a(), b()]).toEqual([["before"], ["before"]]);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("dependent group"), expect.any(Object));
  } finally {
    warning.mockRestore();
  }
});
