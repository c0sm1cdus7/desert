import "../../tests/support/upgrade-vault.ts";
import { copyFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { deserialize, serialize } from "node:v8";
import { expect, it } from "vitest";
import { keptChecks } from "./kept-journals.ts";
import { shopShown } from "../../tests/support/shop.ts";
import { home, kept, legacy, program, seed } from "../../tests/support/upgrade-support.ts";

async function failures(current: ReturnType<typeof program>, folder: string) {
  const errors: string[] = [];
  for (const check of keptChecks(current, shopShown, folder)) {
    try {
      await check.run();
    } catch (error) {
      errors.push(String(error));
    }
  }
  return errors;
}
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

it("blocks a fold-only update that forgot its version, on each kept journal", async () => {
  const path = home();
  await seed(path);
  const folder = kept(path);
  const file = join(folder, "shop.sqlite");
  const before = readFileSync(file);
  copyFileSync(file, join(folder, "second.sqlite"));
  const errors = await failures(program("shop/1", 2), folder);
  expect(errors).toHaveLength(2);
  for (const name of ["shop.sqlite", "second.sqlite"]) {
    expect(errors.some(error => error.includes(name) && error.includes("projectionVersion"))).toBe(true);
  }
  expect(readFileSync(file)).toEqual(before);
  expect(readFileSync(join(folder, "second.sqlite"))).toEqual(before);
});

it("accepts the same history when its new folding version is declared", async () => {
  const path = home();
  await seed(path);
  const folder = kept(path);
  const file = join(folder, "shop.sqlite");
  const before = readFileSync(file);
  const checks = keptChecks(program("shop/2", 2), shopShown, folder);
  expect(checks).toHaveLength(3);
  expect(await failures(program("shop/2", 2), folder)).toEqual([]);
  expect(readFileSync(file)).toEqual(before);
});

it.each(["0ec3f7b", "19a0b47"])("accepts a kept pre-version journal from %s", async revision => {
  const path = home();
  legacy(path, revision);
  expect(await failures(program("shop/2", 2), kept(path))).toEqual([]);
});

it("does not claim upgrade coverage when a kept journal has no previous folds", async () => {
  const path = home();
  await seed(path);
  const folder = kept(path);
  const db = new DatabaseSync(join(folder, "shop.sqlite"));
  try {
    db.exec("delete from snapshots");
  } finally {
    db.close();
  }
  const errors = await failures(program(), folder);
  expect(errors).toHaveLength(1);
  expect(errors[0]).toMatch(/shop.sqlite.*previous folds/);
});

it.each(["tools", "clock"])("checks the complete cached %s, not only tool values", async part => {
  const path = home();
  await seed(path);
  const folder = kept(path);
  const db = new DatabaseSync(join(folder, "shop.sqlite"));
  try {
    const row = db.prepare("select name, state from snapshots where name like ?").get(`${part}%`);
    if (!(row?.state instanceof Uint8Array) || typeof row.name !== "string") throw new Error("Missing fixture");
    const cached: unknown = deserialize(row.state);
    if (!record(cached)) throw new Error("Missing snapshot envelope");
    if (part === "tools") {
      if (!record(cached.state) || !record(cached.state.house)) throw new Error("Missing house");
      cached.state.house.admin = "wrong-admin";
    } else cached.state = new Map([["unwritten", { at: 9, cause: "unwritten", seq: 1 }]]);
    db.prepare("update snapshots set state = ? where name = ?").run(serialize(cached), row.name);
  } finally {
    db.close();
  }
  const errors = await failures(program(), folder);
  expect(errors.some(error => /shop.sqlite.*projectionVersion/.test(error))).toBe(true);
});

it.each(["damaged", "partial"])("refuses %s previous folds even when an update would rebuild", async mode => {
  const path = home();
  await seed(path);
  const folder = kept(path);
  const db = new DatabaseSync(join(folder, "shop.sqlite"));
  try {
    if (mode === "partial") db.exec("delete from snapshots where name like 'clock%'");
    else db.prepare("update snapshots set state = ?").run(new Uint8Array([0, 1, 2]));
  } finally {
    db.close();
  }
  const errors = await failures(program("shop/2", 2), folder);
  expect(errors).toHaveLength(1);
  expect(errors[0]).toMatch(/shop.sqlite.*previous folds/);
});
