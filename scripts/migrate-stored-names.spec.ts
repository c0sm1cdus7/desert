// The stored-name migration on a journal the old code wrote in the old names, checked against the old code's own fold.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { isDeepStrictEqual } from "node:util";
import { deserialize } from "node:v8";
import { afterAll, beforeAll, expect, it } from "vitest";
import { legacyDoorHouse } from "../tests/support/legacy-door-house.ts";
import { oldTree } from "../tests/support/old-tree.ts";
import { shop } from "../tests/support/shop.ts";
import { emptyHouse, houseStep } from "../src/house/members.ts";
import { readFact } from "../src/storage/journal-record.ts";
import { SqliteJournal } from "../src/storage/journal-store.ts";
import { openModelSpendingAccount } from "../src/runtime/minds/model-spending-account.ts";
import { migratedPositions, renamedData, storedNames } from "../src/runtime/stored-names.ts";
import { migrationCommand } from "./migrate-stored-names.ts";

const fixture = legacyDoorHouse({ migrate: false });
const journal = join(fixture.home, "journal.sqlite");
const original = join(fixture.backups, "original.sqlite");
const work = mkdtempSync("/tmp/desert-stored-names-");
let oldHouse: unknown;
type Row = Readonly<Record<string, unknown>>;
const rows = (file: string): Row[] => {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    return db.prepare("select * from events order by seq").all();
  } finally {
    db.close();
  }
};
const oldNames = [...storedNames.door.keys(), ...storedNames.effect.keys()];
const holdsOldName = (row: Row) => oldNames.some(name => String(row.data).includes(`"${name}"`));
const run = (...args: string[]) => {
  const said: string[] = [];
  return { code: migrationCommand(args, line => said.push(line)), said: said.join("\n") };
};
/** A fresh copy of the journal the old code wrote, in a folder of its own. */
const copy = (name: string) => {
  const folder = join(work, name);
  mkdirSync(join(folder, "backups"), { recursive: true });
  copyFileSync(original, join(folder, "journal.sqlite"));
  return { file: join(folder, "journal.sqlite"), backups: join(folder, "backups") };
};
beforeAll(() => {
  new DatabaseSync(journal).prepare("vacuum into ?").run(original);
  const tree = oldTree("e1371d70");
  try {
    const out = join(work, "old-house.bin");
    execFileSync(process.execPath, [resolve("tests/support/fold-old-house.mjs"), tree.base, original, out]);
    oldHouse = deserialize(readFileSync(out));
  } finally {
    tree.close();
  }
}, 60_000);
afterAll(() => {
  fixture.close();
  rmSync(work, { recursive: true, force: true });
});

it("the old code wrote every migrated name, in every position the migration names", () => {
  const written = rows(original).filter(holdsOldName);
  expect(new Set(written.map(row => row.kind))).toEqual(
    new Set(migratedPositions.map(position => position.kind).filter(kind => kind !== "rule-evaluated")),
  );
  expect(written.every(row => renamedData(String(row.kind), JSON.parse(String(row.data))) !== undefined)).toBe(true);
  // The old engine records a rule it evaluates only when a rule stops an act: the seed never let one.
  expect(
    rows(original)
      .filter(row => row.kind === "rule-evaluated")
      .every(row => !holdsOldName(row)),
  ).toBe(true);
  // The current reader reads no old name in a core fact: an unmigrated one stops the house where it is found, named.
  for (const row of written.filter(each => each.kind !== "act"))
    expect(() => readFact(shop, row)).toThrow(String(row.seq));
});

it("renames in place after a backup, and folds to the very house the old code folded", () => {
  const { file, backups } = copy("migrate");
  const result = run("--backup", backups, "--journal", file);
  expect(result.code).toBe(0);
  expect(result.said).toContain("renombrados");
  const before = rows(original),
    after = rows(file);
  expect(after.map(({ data, ...rest }) => rest)).toEqual(before.map(({ data, ...rest }) => rest));
  expect(after.filter(holdsOldName)).toEqual([]);
  after.forEach((row, index) => {
    const old = before[index] ?? {};
    const renamed = renamedData(String(old.kind), JSON.parse(String(old.data)));
    expect(JSON.parse(String(row.data))).toEqual(renamed ?? JSON.parse(String(old.data)));
  });
  expect(rows(join(backups, "journal.sqlite"))).toEqual(before);
  let house = emptyHouse;
  for (const row of after) house = houseStep(house, readFact(shop, row));
  expect(isDeepStrictEqual(house, oldHouse)).toBe(true);
  expect([...house.doors.keys.values()].map(key => key.door)).toContain("agent");
});

it("is idempotent: a second run renames nothing, writes no backup and leaves every row, in any backup folder", () => {
  const { file, backups } = copy("twice");
  expect(run("--backup", backups, "--journal", file).code).toBe(0);
  const once = rows(file);
  const second = join(work, "twice", "second");
  mkdirSync(second);
  const again = run("--backup", second, "--journal", file);
  expect(again.code).toBe(0);
  expect(again.said).toContain("nada que renombrar");
  expect(rows(file)).toEqual(once);
  expect(readdirSync(second)).toEqual([]);
  const same = run("--backup", backups, "--journal", file);
  expect(same.code).toBe(0);
  expect(same.said).toContain("nada que renombrar");
  expect(rows(file)).toEqual(once);
});

it("refuses without a backup folder, with a folder that already holds a copy, and while a house writes", () => {
  const { file, backups } = copy("refusals");
  const bare = run("--journal", file);
  expect(bare.code).toBe(2);
  expect(bare.said).toContain("--backup");
  expect(run("--backup", join(backups, "missing"), "--journal", file).code).toBe(1);
  copyFileSync(original, join(backups, "journal.sqlite"));
  expect(run("--backup", backups, "--journal", file).code).toBe(1);
  rmSync(join(backups, "journal.sqlite"));
  const open = new SqliteJournal(file, shop, undefined, "preserve");
  try {
    expect(run("--backup", backups, "--journal", file).code).toBe(1);
  } finally {
    open.close();
  }
  expect(rows(file)).toEqual(rows(original));
  expect(existsSync(join(backups, "journal.sqlite"))).toBe(false);
});

it("refuses a journal it cannot read under the English names, and writes nothing", () => {
  const { file, backups } = copy("unreadable");
  const db = new DatabaseSync(file);
  db.exec("drop trigger events_no_update");
  db.prepare("update events set data = ? where kind = 'door-invitation-issued'").run('{"door":"agente"}');
  db.close();
  const before = rows(file);
  expect(run("--backup", backups, "--journal", file).code).toBe(1);
  expect(rows(file)).toEqual(before);
  expect(readdirSync(backups)).toEqual([]);
});

it("checks a model account, which holds no Spanish name, and leaves it as it was", () => {
  const home = join(work, "account-home"),
    backups = join(work, "account-backups");
  mkdirSync(home);
  mkdirSync(backups);
  const file = join(work, "account.sqlite");
  openModelSpendingAccount(home, { file, openingNanoUsd: 0 }, "claude", 1_000_000).close();
  const before = rows(file);
  const checked = run("--backup", backups, "--account", file);
  expect(checked.code).toBe(0);
  expect(checked.said).toContain("nada que renombrar");
  expect(rows(file)).toEqual(before);
});

it("names each position it renames, and nothing beside it", () => {
  const action = { tool: "sales", act: "register" };
  expect(renamedData("rule-evaluated", { action, results: [{ id: "r", version: 1, outcome: "frena" }] })).toEqual({
    action,
    results: [{ id: "r", version: 1, outcome: "block" }],
  });
  expect(renamedData("rule-evaluated", { action, results: [{ id: "r", version: 1, outcome: "passed" }] })).toBe(
    undefined,
  );
  expect(renamedData("act", { object: "rules", option: "save", input: { effect: "requiere-supervisor" } })).toEqual({
    object: "rules",
    option: "save",
    input: { effect: "require-supervisor" },
  });
  expect(renamedData("act", { object: "sales", option: "register", input: { door: "agente", effect: "frena" } })).toBe(
    undefined,
  );
  expect(renamedData("sale-registered", { sale: "frena", total: 10 })).toBe(undefined);
  expect(renamedData("door-key-issued", { id: "k", door: "terminal" })).toBe(undefined);
});
