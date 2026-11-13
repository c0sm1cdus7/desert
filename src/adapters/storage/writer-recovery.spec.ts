import { join } from "node:path";
import { deserialize, serialize } from "node:v8";
import { DatabaseSync } from "node:sqlite";
import { expect, it, vi } from "vitest";
import { ProjectionCache } from "../../journal/projections.ts";
import { snapshotEvery } from "../../catalogs/levers.ts";
import { home, open, sale, fold, watch } from "../../../tests/support/storage-rig.ts";

const seed = () => {
  const file = join(home(), "journal.sqlite");
  const journal = open(file);
  watch(journal);
  journal.append(sale("left"), 0);
  journal.append(sale("right"), 1);
  journal.close();
  return file;
};
const replace = (file: string, value: object, current = false) => {
  const db = new DatabaseSync(file);
  try {
    const bytes = db.prepare("select state from snapshots").get()?.state;
    const saved: unknown = bytes instanceof Uint8Array ? deserialize(bytes) : undefined;
    const prior = current && typeof saved === "object" && saved !== null ? saved : {};
    db.prepare("update snapshots set state = ?").run(serialize({ ...prior, ...value }));
  } finally {
    db.close();
  }
};

it.each([0, 1, 2, 3, -1, 0.5, Number.MAX_SAFE_INTEGER + 1])(
  "rebuilds an old-format cache at sequence %s, including a plausible but incomplete one",
  seq => {
    const file = seed();
    replace(file, { seq, state: ["right"] });
    const next = open(file);
    const reducer = vi.fn(fold);
    const names = next.watch<readonly string[]>("sales", [], reducer);
    next.restore();
    expect(names()).toEqual(["left", "right"]);
    expect(reducer).toHaveBeenCalledTimes(2);
    next.close();
    const again = open(file);
    expect(watch(again)()).toEqual(["left", "right"]);
  },
);

it("rejects a cache beyond the journal even when its format is current", () => {
  const file = seed();
  replace(file, { seq: 3, state: ["right"] }, true);
  expect(watch(open(file))()).toEqual(["left", "right"]);
});

it("resets dependent projections together when only one legacy cache exists", () => {
  const file = seed();
  replace(file, { seq: 2, state: ["right"] });
  const next = open(file);
  const names = next.watch<readonly string[]>("sales", [], fold);
  const counts = next.watch("counts", 0, n => n + 1);
  next.restore();
  expect([names(), counts()]).toEqual([["left", "right"], 2]);
});

it("does not skip unknown old facts hidden behind a legacy cache", () => {
  const file = seed();
  const db = new DatabaseSync(file);
  try {
    db.prepare("insert into events values (?, ?, ?, ?, ?, ?, ?, ?)").run(
      3,
      "unknown",
      1,
      "old.unknown",
      "ana",
      "[]",
      "{}",
      null,
    );
  } finally {
    db.close();
  }
  replace(file, { seq: 3, state: ["right"] });
  expect(() => watch(open(file))).toThrow("does not read: #3 old.unknown");
});

it.each([0, 1, snapshotEvery - 1, snapshotEvery, snapshotEvery + 1])(
  "preserves every sale across two restarts at the boundary %s",
  count => {
    const file = join(home(), "journal.sqlite");
    const journal = open(file);
    const names = watch(journal);
    for (let n = 0; n < count; n++) journal.append(sale(`s${n}`), 0);
    const expected = names();
    journal.close();
    const next = open(file);
    expect(watch(next)()).toEqual(expected);
    next.close();
    expect(watch(open(file))()).toEqual(expected);
  },
);

it("a gap is refused before reducing; rollback restores state and position", () => {
  const cache = new ProjectionCache<readonly number[], { seq: number }>([], (s, e) => [...s, e.seq], undefined);
  cache.fold({ seq: 1 });
  expect(() => cache.fold({ seq: 3 })).toThrow();
  expect([cache.seq, cache.state]).toEqual([1, [1]]);
  const undo = cache.mark();
  cache.fold({ seq: 2 });
  undo();
  expect([cache.seq, cache.state]).toEqual([1, [1]]);
  expect(() => cache.fold({ seq: 1 })).toThrow();
  expect(cache.fold({ seq: 2 })).toEqual([1, 2]);
});

it("an unseen row refuses the next append whole; reopening folds the missing row", () => {
  const file = join(home(), "journal.sqlite");
  const journal = open(file);
  const names = watch(journal);
  journal.append(sale("left"), 0);
  const db = new DatabaseSync(file);
  try {
    db.prepare("insert into events values (?, ?, ?, ?, ?, ?, ?, ?)").run(
      2,
      "foreign",
      0,
      "sale-registered",
      "ana",
      "[]",
      '{"sale":"middle","total":10}',
      null,
    );
  } finally {
    db.close();
  }
  expect(() => journal.append(sale("right"), 0)).toThrow();
  expect(names()).toEqual(["left"]);
  expect(journal.replay([], fold)).toEqual(["left", "middle"]);
  journal.close();
  const next = open(file);
  const nextNames = watch(next);
  expect(nextNames()).toEqual(["left", "middle"]);
  expect(next.append(sale("right"), 0).seq).toBe(3);
  expect(nextNames()).toEqual(["left", "middle", "right"]);
});

it.each([-1, 0.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, "2", undefined])(
  "discards a current cache with invalid sequence %s",
  seq => {
    const file = seed();
    replace(file, { seq, state: ["right"] }, true);
    expect(watch(open(file))()).toEqual(["left", "right"]);
  },
);

it("resets a valid zero-position sibling when another cache is incompatible", () => {
  const file = join(home(), "journal.sqlite");
  open(file).close();
  const db = new DatabaseSync(file);
  try {
    db.prepare("insert into snapshots values (?, ?)").run(
      "sales",
      serialize({
        version: 3,
        identity: "",
        journal: db.prepare("select id from journal_identity").get()?.id,
        seq: 0,
        state: ["wrong"],
      }),
    );
    db.prepare("insert into snapshots values (?, ?)").run("counts", serialize({ seq: 0, state: 42 }));
  } finally {
    db.close();
  }
  const journal = open(file);
  const names = journal.watch<readonly string[]>("sales", [], fold);
  const counts = journal.watch("counts", 0, n => n + 1);
  journal.restore();
  expect([names(), counts()]).toEqual([[], 0]);
});
