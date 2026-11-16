import { expect, it } from "vitest";
import { effect } from "./facts.ts";
import { cancelInheritedWake } from "./inherited-wake.ts";
import { zeroHouse } from "../../tests/support/zero-house.ts";
import { zeroMind } from "../../tests/support/zero-mind.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shopRegistry } from "../../tests/support/shop.ts";

it("only the administrator can cancel an identity's inherited wake, and the mind uses its own id", () => {
  const mind = zeroMind();
  const other = zeroMind("other", undefined, []);
  const rig = shopRig({ registry: [...shopRegistry, mind.tool, other.tool] });
  try {
    rig.bus.emit(effect("wake-at", { id: "legado", at: Date.now() + 60_000 }, "beto"));
    const cancel = (by: string) => cancelInheritedWake(rig.state, rig.bus, by, "legado");
    expect(() => cancel("beto")).toThrow();
    expect(() => cancel("mind:desk")).toThrow();
    expect(() =>
      mind.startup().bus.emit({ layer: "house", kind: "wake-at", data: { id: "legado", at: null } }),
    ).toThrow();
    expect(cancel("ana").by).toBe("ana");
    expect(mind.schedule(null).data.id).toBe("desk:zero");
    expect(() => cancelInheritedWake(rig.state, rig.bus, "ana", "desk:zero")).toThrow();
    rig.restart();
    expect(rig.state().wakeOwners.get("legado")).toBe("beto");
  } finally {
    rig.close();
  }
});

it("the real house exposes the administrator operation and preserves cancellation after restart", () => {
  const rig = zeroHouse();
  rig.house().bus.emit(effect("wake-at", { id: "legado", at: Date.now() + 60_000 }, "ana"));
  expect(() => rig.house().cancelInheritedWake("beto", "legado")).toThrow();
  rig.house().cancelInheritedWake("ana", "legado");
  rig.restart();
  const wakes = rig.facts().filter(e => e.kind === "wake-at" && e.data.id === "legado");
  expect(wakes.at(-1)).toMatchObject({ by: "ana", data: { at: null } });
});
