import { expect, it, vi, afterEach } from "vitest";
import { zeroHouse } from "../../tests/support/zero-house.ts";
import { zeroMind } from "../../tests/support/zero-mind.ts";
import { object } from "../fields/visible-text.ts";
import { toolAct } from "../tools/act-definition.ts";
import type { Shop } from "../../tests/support/shop.ts";
import { effect } from "./facts.ts";
afterEach(() => vi.useRealTimers());

for (const trigger of ["woke", "stimulus"] as const)
  it(`${trigger}: a real delivery cannot revive a rolled back wake, even after reopening`, async () => {
    vi.useFakeTimers();
    const empty = object({});
    const mind = zeroMind("desk", {
      write: toolAct<Shop, typeof empty>(empty, () => Promise.resolve({ status: "accepted", text: "Listo" })),
    });
    const rig = zeroHouse(mind);
    rig.kit(null);
    let caught = 0;
    const heard: string[] = [];
    const bus = mind.startup().bus;
    bus.on("wake-at", event => heard.push(event.data.id));
    bus.on(trigger, () => {
      try {
        bus.together(() => {
          mind.schedule(Date.now() + 50);
          throw new Error("deshacer");
        });
      } catch {
        caught++;
      }
    });
    if (trigger === "woke") {
      bus.emit({ layer: "house", kind: "wake-at", data: { id: "desk:start", at: Date.now() + 5 } });
      await vi.advanceTimersByTimeAsync(10);
    } else {
      const pending = mind.act();
      await vi.advanceTimersByTimeAsync(10);
      expect(await pending).toEqual({ status: "accepted" });
    }
    expect(caught).toBe(1);
    expect(heard).not.toContain("desk:zero");
    expect(rig.house().tools.state().wakeOwners.has("desk:zero")).toBe(false);
    rig.restart();
    await vi.advanceTimersByTimeAsync(100);
    expect(mind.pending).toEqual([]);
    expect(rig.facts().filter(e => (e.kind === "wake-at" || e.kind === "woke") && e.data.id === "desk:zero")).toEqual(
      [],
    );
    rig.restart();
    expect(rig.house().tools.state().tools.desk?.size).toBe(0);
  });

it("a caught inner rollback preserves the outer facts, folds, sequence and pending wake across reopening", async () => {
  vi.useFakeTimers();
  const rig = zeroHouse();
  rig.kit(null);
  const bus = rig.house().bus;
  bus.together(() => {
    bus.emit(effect("scene", { general: "outside" }, "ana"));
    expect(() =>
      bus.together(() => {
        bus.emit(effect("scene", { general: "adentro" }, "ana"));
        rig.mind.schedule(Date.now() + 5);
        throw new Error("internal");
      }),
    ).toThrow("internal");
    expect(rig.house().tools.state().house.scenes.get("ana")?.data.general).toBe("outside");
    rig.mind.schedule(Date.now() + 50);
  });
  rig.restart();
  expect(rig.house().tools.state().house.scenes.get("ana")?.data.general).toBe("outside");
  await vi.advanceTimersByTimeAsync(100);
  expect(rig.mind.pending).toHaveLength(1);
  expect(await rig.mind.pending[0]).toEqual({ status: "accepted" });
  const facts = rig.facts();
  expect(facts.map(e => e.seq)).toEqual(facts.map((_, i) => i + 1));
  expect(facts.filter(e => e.kind === "scene").map(e => e.data.general)).toEqual(["outside"]);
  rig.restart();
  await vi.advanceTimersByTimeAsync(100);
  expect(rig.mind.pending).toHaveLength(1);
});
