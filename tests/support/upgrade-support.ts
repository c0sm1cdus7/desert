import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect } from "vitest";
import { startHouse } from "../../src/programs/house-runtime.ts";
import { perform } from "../../src/programs/promised-stage.ts";
import { startState, toolsStep } from "../../src/tools/tools.ts";
import { MemoryKeys } from "./shop-rig.ts";
import { shopProgram, shopSlices, type Shop } from "./shop.ts";

const homes: string[] = [];
afterEach(() => {
  for (const home of homes.splice(0)) rmSync(home, { recursive: true, force: true });
});
export const home = () => {
  const path = mkdtempSync(join(tmpdir(), "a04-"));
  homes.push(path);
  return path;
};
export const time = { now: () => 1000, wait: () => () => {} };
export const creation = { admin: "ana", assignments: [{ identity: "ana", tools: ["sales", "payments"] }] };
export function program(projectionVersion = "shop/1", factor = 1, folded = () => {}) {
  const sales: typeof shopSlices.step.sales = (state, event, before) => {
    const next = shopSlices.step.sales(state, event, before);
    if (event.kind !== "sale-registered") return next;
    folded();
    return new Map(next).set(event.data.sale, { total: event.data.total * factor, paid: 0, by: event.by });
  };
  return { ...shopProgram, projectionVersion, slices: { ...shopSlices, step: { ...shopSlices.step, sales } } };
}
export const open = (path: string, current = program()) => {
  let instant = 1000;
  const clock = { ...time, now: () => instant };
  return {
    ...startHouse<Shop>(path, { ...current, by: "shop", creation, keys: new MemoryKeys() }, clock),
    pass: (days: number) => {
      instant += days * 86_400_000;
    },
    setTime: (at: number) => {
      instant = at;
    },
  };
};
export type House = ReturnType<typeof open>;
export async function seed(path: string, current = program(), total = 10) {
  const house = open(path, current);
  try {
    const done = await perform(house, "sales", { act: "register", input: { sale: "s1", total } });
    expect(done.status).toBe("accepted");
  } finally {
    house.close();
  }
}
export function matches(house: House, current: ReturnType<typeof program>) {
  const again = house.journal.replay(startState<Shop>(current.slices, "shop"), (state, event) =>
    toolsStep<Shop>(state, event, current.slices),
  );
  expect(house.tools.state()).toEqual(again);
}
export function kept(path: string, name = "shop.sqlite") {
  const folder = home();
  copyFileSync(join(path, "journal.sqlite"), join(folder, name));
  return folder;
}
// Frozen at the named revisions: never regenerate these fixtures with the implementation under test.
export function legacy(path: string, revision = "0ec3f7b") {
  mkdirSync(path, { recursive: true });
  copyFileSync(join(import.meta.dirname, `../fixtures/legacy-${revision}.sqlite`), join(path, "journal.sqlite"));
}
