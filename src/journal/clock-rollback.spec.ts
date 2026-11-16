import type { ShopFact } from "../../tests/support/shop.ts";
import { Bus } from "./bus.ts";
import { clockStep, startClock } from "./clock.ts";
import { open } from "../../tests/support/storage-rig.ts";
import { afterEach, expect, it, vi } from "vitest";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { effect } from "../house/facts.ts";
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => {
  rigs.splice(0).forEach(rig => rig.close());
  vi.useRealTimers();
});
for (const nested of ["single", "inner", "outer"] as const)
  for (const change of ["new", "replace", "cancel"] as const)
    it(`a ${nested} rollback restores the clock after a ${change} schedule`, async () => {
      vi.useFakeTimers();
      const rig = shopRig();
      rigs.push(rig);
      const wake = (at: number | null) => rig.bus.emit(effect("wake-at", { id: "deadline", at }, "shop"));
      const original = change === "new" ? undefined : wake(Date.now() + 100);
      const fail = () =>
        expect(() =>
          rig.bus.together(() => {
            wake(change === "cancel" ? null : Date.now() + 10);
            throw new Error("undo");
          }),
        ).toThrow("undo");
      if (nested === "outer") {
        expect(() =>
          rig.bus.together(() => {
            rig.bus.together(() => wake(change === "cancel" ? null : Date.now() + 10));
            throw new Error("outer");
          }),
        ).toThrow("outer");
      } else if (nested === "inner") rig.bus.together(fail);
      else fail();
      await vi.advanceTimersByTimeAsync(20);
      expect(rig.facts().filter(e => e.kind === "woke")).toEqual([]);
      await vi.advanceTimersByTimeAsync(100);
      const wakes = rig.facts().filter(e => e.kind === "woke");
      expect(wakes.map(e => e.cause)).toEqual(original ? [[original.id]] : []);
    });

it("a clock stopped during a write is not rearmed by its later rollback", () => {
  const journal = open(":memory:");
  const bus = new Bus<ShopFact>(
    entry => journal.append(entry, 100),
    write => journal.batch(write),
  );
  const original = bus.emit(effect("wake-at", { id: "deadline", at: 200 }, "shop"));
  let waits = 0;
  const stop = startClock(
    bus,
    {
      now: () => 100,
      wait: () => {
        waits++;
        return () => {};
      },
    },
    clockStep(new Map(), original),
    "shop",
  );
  expect(() =>
    bus.together(() => {
      bus.emit(effect("wake-at", { id: "deadline", at: 300 }, "shop"));
      stop();
      throw new Error("undo");
    }),
  ).toThrow("undo");
  expect(waits).toBe(2);
  bus.close();
});
