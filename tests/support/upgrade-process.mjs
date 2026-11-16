import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { startHouse } from "../../src/runtime/house-runtime.ts";
import { shopProgram, shopSlices } from "./shop.ts";
import { startState, toolsStep } from "../../src/house/state.ts";
import { stateResult } from "../../src/journal/readonly-state.ts";

const mode = process.argv[2];
if (!["old", "update", "reopen", "crash"].includes(mode)) throw new Error("Choose old, update, reopen or crash");
const factor = mode === "old" ? 1 : 2;
const current = {
  ...shopProgram,
  projectionVersion: factor === 1 ? "shop/1" : "shop/2",
  slices: {
    ...shopSlices,
    step: {
      ...shopSlices.step,
      sales(state, event, before) {
        if (mode === "crash" && event.kind === "sale-registered") process.kill(process.pid, "SIGKILL");
        const next = shopSlices.step.sales(state, event, before);
        return event.kind === "sale-registered"
          ? new Map(next).set(event.data.sale, { total: event.data.total * factor, paid: 0, by: event.by })
          : next;
      },
    },
  },
};
const path = process.argv[3];
const creation = { admin: "ana", assignments: [{ identity: "ana", tools: ["sales", "payments"] }] };
const house = startHouse(
  path,
  { ...current, by: "shop", creation },
  { now: () => 1000, wait: () => () => {} },
);
try {
  if (mode === "old") {
    house.tools.act({ act: "attend", input: { target: "sales" } }, 0, "ana");
    const result = house.tools.act(
      { act: "register", target: "sales", input: { sale: "s1", total: 10 } },
      house.tools.state().through,
      "ana",
    );
    strictEqual(result.status, "accepted");
  }
  const total = house.tools.state().tools.sales.get("s1")?.total;
  const again = house.journal.replay(startState(current.slices, "shop"), (state, event) =>
    toolsStep(state, event, current.slices),
  );
  console.log(JSON.stringify({ mode, total, replay: again.tools.sales.get("s1")?.total }));
  strictEqual(total, factor * 10);
  deepStrictEqual(stateResult(house.tools.state()), again);
} finally {
  house.close();
}
