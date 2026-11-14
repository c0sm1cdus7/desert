import { afterEach, expect, it } from "vitest";
import { effect } from "../../journal/events.ts";
import { zeroMind } from "../../../tests/support/zero-mind.ts";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shopRegistry } from "../../../tests/support/shop.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
function opened() {
  const desk = zeroMind();
  const rig = shopRig({ registry: [...shopRegistry, desk.tool] });
  rigs.push(rig);
  rig.bus.emit(effect("kit-set", { holder: "mind:desk", tool: "desk", acts: null }, "ana"));
  return { rig, desk };
}
it("a saved outer cause remains valid after a sibling rollback, even when the rolled back ID is reused", async () => {
  const { rig, desk } = opened();
  const pending: ReturnType<typeof desk.act>[] = [];
  desk.startup().bus.on("stimulus", e => {
    if (e.by === "shop") pending.push(desk.act());
  });
  rig.bus.together(() => {
    rig.bus.emit(effect("stimulus", { tool: "before" }, "shop"));
    expect(() =>
      rig.bus.together(() => {
        rig.bus.emit(effect("stimulus", { tool: "rolled-back" }, "shop"));
        throw new Error("inner");
      }),
    ).toThrow("inner");
    rig.bus.emit(effect("stimulus", { tool: "after" }, "shop"));
  });
  expect(await Promise.all(pending)).toMatchObject([
    { status: "accepted" },
    { status: "rejected" },
    { status: "accepted" },
  ]);
  const causes = rig
    .facts()
    .filter(e => e.kind === "stimulus")
    .filter(e => e.by === "shop");
  expect(causes.map(e => e.data.tool)).toEqual(["before", "after"]);
  expect(
    rig
      .facts()
      .filter(e => e.kind === "act")
      .map(e => e.cause),
  ).toEqual(causes.map(e => [e.id]));
});
