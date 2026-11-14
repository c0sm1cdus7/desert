import { contender } from "../../../tests/support/storage-process.ts";
import { existsSync, linkSync, mkdirSync, statSync, symlinkSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { journalReader, journalKept } from "../../adapters/storage/journal-store.ts";
import { journalTexts } from "../../texts/journal.texts.ts";
import { shop } from "../../../tests/support/shop.ts";
import { home, open, sale, watch, track } from "../../../tests/support/storage-rig.ts";

it.each(["directory", "file", "relative", "dotdot"])(
  "one writer through a %s alias; refusal keeps the first writer and its reader alive",
  kind => {
    const root = home();
    const real = join(root, "real");
    mkdirSync(real);
    const file = join(real, "journal.sqlite");
    const first = open(file);
    const state = watch(first);
    let alias = relative(process.cwd(), file);
    if (kind === "directory") {
      symlinkSync(real, join(root, "alias"), "dir");
      alias = join(root, "alias", "journal.sqlite");
    } else if (kind === "file") {
      alias = join(root, "journal-link.sqlite");
      symlinkSync(file, alias);
    } else if (kind === "dotdot") {
      mkdirSync(join(real, "nested"));
      alias = `${real}/nested/../journal.sqlite`;
    }
    expect(() => open(alias)).toThrow(journalTexts.locked);
    first.append(sale("left"), 100);
    const reader = track(journalReader(alias, shop));
    expect(reader.since(0).map(event => event.kind)).toEqual(["sale-registered"]);
    expect(state()).toEqual(["left"]);
    first.close();
    const next = open(alias);
    const nextState = watch(next);
    next.append(sale("right"), 100);
    expect(nextState()).toEqual(["left", "right"]);
    next.close();
    expect(watch(open(file))()).toEqual(["left", "right"]);
  },
);

it("refuses a hard-linked database even after the first writer closes", () => {
  const root = home();
  const file = join(root, "journal.sqlite");
  open(file).close();
  const other = join(home(), "journal.sqlite");
  linkSync(file, other);
  expect(() => open(file)).toThrow("hard links");
  expect(() => open(other)).toThrow("hard links");
});

it("independent directories and in-memory databases remain independent", () => {
  for (const files of [
    [join(home(), "journal.sqlite"), join(home(), "journal.sqlite")],
    [":memory:", ":memory:"],
  ]) {
    const [a, b] = files.map(file => open(file));
    if (!a || !b) throw new Error("two fixtures required");
    const left = watch(a);
    const right = watch(b);
    a.append(sale("left"), 0);
    b.append(sale("right"), 0);
    expect([left(), right()]).toEqual([["left"], ["right"]]);
  }
});

it("a kept-journal operation cannot erase the cache of a live writer", () => {
  const file = join(home(), "journal.sqlite");
  const writer = open(file);
  watch(writer);
  writer.append(sale("left"), 100);
  expect(() => journalKept(file)).toThrow(journalTexts.locked);
  writer.close();
  expect(journalKept(file).last).toBe(100);
});

it("another process cannot write through the directory alias", () => {
  const root = home();
  const real = join(root, "real");
  mkdirSync(real);
  const file = join(real, "journal.sqlite");
  open(file);
  const alias = join(root, "alias");
  symlinkSync(real, alias, "dir");
  const script = `
    import { SqliteJournal } from '${new URL("./journal-store.ts", import.meta.url).href}';
    import { shop } from '${new URL("../../../tests/support/shop.ts", import.meta.url).href}';
    try { new SqliteJournal(process.argv[1], shop).close(); process.exitCode = 2; }
    catch (error) { if (!error.message.includes('already open')) throw error; }
  `;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script, join(alias, "journal.sqlite")]);
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr.toString()).toBe(0);
});

it("independent files in one directory keep their leases when either owner closes", () => {
  const root = home();
  const left = open(join(root, "left.sqlite"));
  const rightFile = join(root, "right.sqlite");
  const right = open(rightFile);
  const names = watch(right);
  left.close();
  expect(() => open(rightFile)).toThrow(journalTexts.locked);
  right.append(sale("right"), 0);
  expect(names()).toEqual(["right"]);
  right.close();
  expect(watch(open(rightFile))()).toEqual(["right"]);
});

it.each(["CAFÉ.SQLITE", "Cafe\u0301.sqlite"])("respects filesystem identity for spelling %s", async spelling => {
  const root = home();
  const file = join(root, "Café.sqlite");
  const alias = join(root, spelling);
  const owner = open(file);
  const state = watch(owner);
  const same = existsSync(alias) && statSync(alias).ino === statSync(file).ino;
  if (same) expect(() => open(alias)).toThrow(journalTexts.locked);
  else open(alias).close();
  const child = contender(alias, root, "spelling");
  try {
    expect(await child.next()).toBe("ready");
    child.send("open");
    expect(await child.next()).toBe(same ? journalTexts.locked : "opened");
    expect(owner.append(sale("owned"), 0).seq).toBe(1);
    expect(state()).toEqual(["owned"]);
  } finally {
    await child.stop(true);
  }
});
