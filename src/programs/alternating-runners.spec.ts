import "../../tests/support/upgrade-vault.ts";
import { expect, it } from "vitest";
import { home, program, seed, creation, time } from "../../tests/support/upgrade-support.ts";
import { shopSlices, type Shop } from "../../tests/support/shop.ts";
import { startState, toolsStep } from "../tools/tools.ts";
import { startHouse } from "./house-runtime.ts";
it("verifies each runner's cached prefix and folds its tail once across ten actual boots", async () => {
  const path = home();
  let folded = 0;
  const visited: number[] = [];
  const sales: typeof shopSlices.step.sales = (state, event, before) => {
    visited.push(event.seq);
    const next = shopSlices.step.sales(state, event, before);
    if (event.kind !== "sale-registered") return next;
    folded++;
    return new Map(next).set(event.data.sale, { total: event.data.total, paid: 0, by: before.by });
  };
  const base = program("per-runner/1");
  const current = { ...base, slices: { ...base.slices, step: { ...base.slices.step, sales } } };
  await seed(path, current);
  for (let round = 0; round < 10; round++) {
    const by = round % 2 ? "beto" : "ana";
    folded = 0;
    visited.length = 0;
    const house = startHouse<Shop>(path, { ...current, by, creation }, time);
    try {
      // Reused snapshots must also prove their prefix against the journal before folding the tail.
      expect(folded).toBe(1);
      expect(visited).toEqual(Array.from({ length: house.tools.state().through }, (_, index) => index + 1));
      expect(house.journal.restoration().reused).toBe(round >= 2);
      expect(house.tools.state().by).toBe(by);
      expect(house.tools.state().tools.sales.get("s1")?.by).toBe(by);
      const replayed = house.journal.replay(startState<Shop>(current.slices, by), (state, e) =>
        toolsStep<Shop>(state, e, current.slices),
      );
      expect(house.tools.state()).toEqual(replayed);
      expect(house.storageNotices()).toEqual([]);
      expect(house.journal.replay(0, (n, e) => n + Number(e.kind === "boot"))).toBe(round + 2);
    } finally {
      house.close();
    }
  }
});
