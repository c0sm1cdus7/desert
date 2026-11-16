import "../../tests/support/upgrade-vault.ts";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { startHouse } from "./house-runtime.ts";
import { perform } from "../checks/promises/promised-stage.ts";
import { creation, home, legacy, matches, open, program, seed, time } from "../../tests/support/upgrade-support.ts";

it.each([0, 1, 10, 1_000_000])("recalculates an existing sale of %i after a fold-only update", async total => {
  const path = home();
  await seed(path, program(), total);
  const current = program("shop/2", 2);
  const house = open(path, current);
  try {
    expect(house.tools.state().tools.sales.get("s1")?.total).toBe(total * 2);
    matches(house, current);
  } finally {
    house.close();
  }
});

it("rebuilds once; a second opening verifies the cached state and new acts stay consistent", async () => {
  const path = home();
  await seed(path);
  let folds = 0;
  const current = program("shop/2", 2, () => folds++);
  let house = open(path, current);
  try {
    expect(folds).toBe(1);
  } finally {
    house.close();
  }
  folds = 0;
  house = open(path, current);
  try {
    expect(folds).toBe(1);
    expect(house.journal.restoration().reused).toBe(true);
    const done = await perform(house, "payments", {
      act: "receive",
      input: { sale: "s1", payment: "p1", amount: 3 },
    });
    expect(done.status).toBe("accepted");
    expect(house.tools.state().tools.sales.get("s1")).toMatchObject({ total: 20, paid: 3 });
    expect(house.tools.state().tools.payments.received).toBe(3);
    matches(house, current);
  } finally {
    house.close();
  }
});

it.each(["0ec3f7b", "19a0b47"])("opens the old key format from %s by folding its facts again", revision => {
  const path = home();
  legacy(path, revision);
  const current = program("shop/2", 2);
  const house = open(path, current);
  try {
    expect(house.tools.state().tools.sales.get("s1")?.total).toBe(20);
    matches(house, current);
  } finally {
    house.close();
  }
});

it("keeps a second opener out during an update and can reopen after close", async () => {
  const path = home();
  await seed(path);
  const current = program("shop/2", 2);
  const first = open(path, current);
  try {
    expect(() => open(path, current)).toThrow(/already open/i);
    expect(first.tools.state().tools.sales.get("s1")?.total).toBe(20);
  } finally {
    first.close();
  }
  const again = open(path, current);
  try {
    matches(again, current);
  } finally {
    again.close();
  }
});

it("keeps two organizations independent when they are open at once", async () => {
  const a = home();
  const b = home();
  await seed(a, program(), 10);
  await seed(b, program(), 7);
  const current = program("shop/2", 2);
  const first = open(a, current);
  try {
    const second = open(b, current);
    try {
      expect([first, second].map(house => house.tools.state().tools.sales.get("s1")?.total)).toEqual([20, 14]);
      matches(first, current);
      matches(second, current);
    } finally {
      second.close();
    }
  } finally {
    first.close();
  }
});

it("opens an empty organization and verifies the unchanged version against the journal", async () => {
  const path = home();
  const empty = open(path);
  try {
    matches(empty, program());
  } finally {
    empty.close();
  }
  await seed(path);
  let folds = 0;
  const current = program("shop/1", 1, () => folds++);
  const house = open(path, current);
  try {
    expect(folds).toBe(1);
    expect(house.journal.restoration().reused).toBe(true);
    matches(house, current);
  } finally {
    house.close();
  }
});

it.each(["", "   ", "missing"])("rejects an invalid projectionVersion (%s) before acquiring storage", value => {
  const path = join(home(), "unopened");
  const options = { ...program(value), by: "shop", creation };
  if (value === "missing") Reflect.deleteProperty(options, "projectionVersion");
  expect(() => {
    const house = startHouse(path, options, time);
    house.close();
  }).toThrow(/projectionVersion/);
  expect(existsSync(path)).toBe(false);
});
