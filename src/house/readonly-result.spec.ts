import { expect, it } from "vitest";
import { zeroHouse } from "../../tests/support/zero-house.ts";
import { zeroMind } from "../../tests/support/zero-mind.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shopRegistry, type Shop } from "../../tests/support/shop.ts";
import { toolAct } from "../tools/act-definition.ts";
import { object } from "../fields/visible-text.ts";
import { effect } from "./facts.ts";
const schema = object({});
const mind = () =>
  zeroMind("desk", {
    read: toolAct<Shop, typeof schema>(schema, (_, { state }) => ({
      status: "accepted",
      text: "Leído",
      detail: state.tools.payments,
    })),
  });
it("an act may return a read-only part as data in its recorded result", async () => {
  const desk = mind();
  const rig = shopRig({ registry: [...shopRegistry, desk.tool] });
  try {
    rig.bus.emit(effect("kit-set", { holder: "mind:desk", tool: "desk", acts: ["read"] }, "ana"));
    expect(await desk.act("read")).toEqual({ status: "accepted" });
    expect(rig.state().entries.at(-1)?.data.detail).toEqual({ received: 0, unmatched: [] });
  } finally {
    rig.close();
  }
});
it("a real protected journal also records read-only result data and reopens it", async () => {
  const rig = zeroHouse(mind());
  rig.kit(["read"]);
  expect(await rig.mind.act("read")).toEqual({ status: "accepted" });
  rig.restart();
  expect(rig.house().tools.state().entries.at(-1)?.data.detail).toEqual({ received: 0, unmatched: [] });
});
