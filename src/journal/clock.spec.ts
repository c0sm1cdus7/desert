// Pure replay and a controlled time source exercise the clock without wall time.
import { describe, expect, it } from "vitest";
import { clockStep, startClock, type Deadlines, type TimeSource } from "./clock.ts";
import { Bus, effect, type HouseEvent } from "./events.ts";
import { SqliteJournal } from "../adapters/storage/journal-store.ts";
import { shop, type ShopFact } from "../../tests/support/shop.ts";

const wake: HouseEvent<"wake-at"> = {
  seq: 1,
  id: "schedule",
  at: 100,
  layer: "house",
  kind: "wake-at",
  by: "ana",
  cause: [],
  data: { id: "turn", at: 200 },
};

describe("clock", () => {
  it("reduces deadlines without mutating previous states and matches a wake to its schedule", () => {
    const empty: Deadlines = new Map();
    const pending = clockStep(empty, wake);
    const replaced = clockStep(pending, { ...wake, seq: 2, id: "replacement", data: { id: "turn", at: 300 } });
    const woke: HouseEvent<"woke"> = {
      seq: 3,
      id: "done",
      at: 200,
      layer: "house",
      kind: "woke",
      by: "clock",
      cause: [wake.id],
      data: { id: "turn" },
    };
    expect(empty.size).toBe(0);
    expect(pending.get("turn")?.at).toBe(200);
    expect(clockStep(replaced, woke)).toEqual(replaced);
    expect(clockStep(pending, woke).size).toBe(0);
    expect(clockStep(replaced, { ...wake, data: { id: "turn", at: null } }).size).toBe(0);
    expect(replaced.get("turn")?.at).toBe(300);
  });

  it("uses injected time, rearms early callbacks and cancels its outstanding wait on stop", () => {
    const journal = new SqliteJournal(":memory:", shop);
    let now = 100;
    let fire = () => {};
    let cancellations = 0;
    const waits: number[] = [];
    const time: TimeSource = {
      now: () => now,
      wait: (at, callback) => {
        waits.push(at);
        fire = callback;
        return () => {
          cancellations += 1;
        };
      },
    };
    const bus = new Bus<ShopFact>(emission => journal.append(emission, time.now()));
    const stop = startClock(bus, time, clockStep(new Map(), wake), "clock");
    try {
      fire();
      expect(waits).toEqual([200, 200]);
      expect(journal.replay(0, count => count + 1)).toBe(0);
      now = 200;
      fire();
      expect(journal.replay<string[]>([], (kinds, event) => [...kinds, event.kind])).toEqual(["woke"]);
      bus.emit(effect("wake-at", { id: "next", at: 300 }, "ana"));
      const before = cancellations;
      bus.emit(shop.fact("sale-registered", { sale: "s1", total: 10 }, "ana"));
      stop();
      expect(cancellations).toBe(before + 2);
    } finally {
      stop();
      bus.close();
      journal.close();
    }
  });
});
