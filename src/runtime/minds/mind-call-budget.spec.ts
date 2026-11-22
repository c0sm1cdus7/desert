import { shopRig } from "../../../tests/support/shop-rig.ts";
import { expect, it } from "vitest";
import {
  fitsModelCap,
  reserveModelCall,
  budgetTransaction,
  settleModelCall,
  markUncertainCall,
} from "./mind-call-budget.ts";
it("counts spending and reservations against the cap and keeps the uncertainty", () => {
  expect(fitsModelCap({ spentNanoUsd: 4, reservedNanoUsd: 3 }, 10, 3)).toBe(true);
  expect(fitsModelCap({ spentNanoUsd: 4, reservedNanoUsd: 3 }, 9, 3)).toBe(false);
  expect(() => fitsModelCap({ spentNanoUsd: 0, reservedNanoUsd: 0 }, undefined, 1)).toThrow();
  expect(settleModelCall("c", 5, { input: 1, output: 0, cacheRead: 0, cacheWrite: 0 }, "assistant:franco").kind).toBe(
    "model-call-settled",
  );
  expect(markUncertainCall("c", "assistant:franco").kind).toBe("model-call-uncertain");
});

it("reserves inside the shared transaction", async () => {
  let reservedNanoUsd = 0;
  const transact: Parameters<typeof reserveModelCall>[0] = (_account, decide) => {
    const event = decide({ spentNanoUsd: 4, reservedNanoUsd });
    if (!event) return Promise.resolve(false);
    reservedNanoUsd += event.data.maximumNanoUsd;
    return Promise.resolve(true);
  };
  const data = { call: "c", turn: "t", number: 1, account: "a", maximumNanoUsd: 3, by: "assistant:franco" as const };
  expect(await reserveModelCall(transact, 10, data)).toBe(true);
  expect(await reserveModelCall(transact, 9, { ...data, call: "d", turn: "u" })).toBe(false);
});

it("the journal confirms a reservation before another uses the balance", async () => {
  const rig = shopRig();
  try {
    const transact = budgetTransaction(rig.bus, () => rig.state().house.modelCalls);
    const data = {
      call: "one",
      turn: "t1",
      number: 1,
      account: "a",
      maximumNanoUsd: 6,
      by: "assistant:franco" as const,
    };
    const results = await Promise.all([
      reserveModelCall(transact, 10, data),
      reserveModelCall(transact, 10, { ...data, call: "two", turn: "t2", by: "mind:supervisor" }),
    ]);
    expect(results).toEqual([true, false]);
    expect(rig.state().house.modelCalls.get("one")?.status).toBe("reserved");
  } finally {
    rig.close();
  }
});
it("a reservation asked for by a rolled-back batch does not reach the journal", async () => {
  const rig = shopRig();
  try {
    const transact = budgetTransaction(rig.bus, () => rig.state().house.modelCalls);
    let pending: Promise<boolean> | undefined;
    expect(() =>
      rig.bus.together(() => {
        pending = reserveModelCall(transact, 10, {
          call: "undo",
          turn: "t",
          number: 1,
          account: "a",
          maximumNanoUsd: 6,
          by: "assistant:franco",
        });
        throw new Error("rollback");
      }),
    ).toThrow("rollback");
    expect(await pending).toBe(false);
    expect(rig.state().house.modelCalls.has("undo")).toBe(false);
  } finally {
    rig.close();
  }
});
