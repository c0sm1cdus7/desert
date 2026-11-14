import "../../tests/support/upgrade-vault.ts";
import { expect, it } from "vitest";
import { home, program, seed, creation, time } from "../../tests/support/upgrade-support.ts";
import { shopSlices, type Shop } from "../../tests/support/shop.ts";
import { startState, toolsStep } from "../tools/tools.ts";
import { startHouse } from "./house-runtime.ts";
it("keeps each runner's dependent folds and replays only their tail across ten actual boots", async () => {
  const path = home();
  let folded = 0;
  const sales: typeof shopSlices.step.sales = (state, event, before) => {
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
    const house = startHouse<Shop>(path, { ...current, by, creation }, time);
    try {
      expect(folded).toBe(round < 2 ? 1 : 0);
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
