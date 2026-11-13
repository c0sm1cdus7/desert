// The bus delivers committed facts to every observer in the same order: the house's and the program's alike.
import { Type } from "@sinclair/typebox";
import { afterEach, describe, expect, expectTypeOf, it } from "vitest";
import { Bus } from "./bus.ts";
import { effect, layerOf, vocabulary, type Catalog, type Event } from "./events.ts";
import { clockStep } from "./clock.ts";
import { SqliteJournal } from "../adapters/storage/journal-store.ts";
import { shop, type ShopEvent, type ShopFact } from "../../tests/support/shop.ts";

const journals: SqliteJournal<ShopFact>[] = [];
const fixture = () => {
  const journal = new SqliteJournal(":memory:", shop);
  journals.push(journal);
  return { journal, bus: new Bus<ShopFact>(emission => journal.append(emission, 100)) };
};
afterEach(() => journals.splice(0).forEach(journal => journal.close()));

const boot = effect("boot", {}, "test");
const sale = shop.fact("sale-registered", { sale: "s1", total: 1500 }, "ana");

describe("event bus", () => {
  it("persists before delivery and queues nested emits behind the current event", () => {
    const { bus, journal } = fixture();
    const seen: string[] = [];
    bus.on(event => {
      seen.push(`first:${event.kind}`);
      expect(journal.replay(0, (_, stored) => stored.seq)).toBe(event.seq);
      if (event.kind === "boot") bus.emit(effect("wake-at", { id: "turn", at: 200 }, "test", [event.id]));
    });
    bus.on(event => seen.push(`second:${event.kind}`));
    bus.on("wake-at", event => {
      expectTypeOf(event.data.at).toEqualTypeOf<number | null>();
      seen.push(`typed:${event.kind}`);
    });
    bus.emit(boot);
    expect(seen).toEqual(["first:boot", "second:boot", "first:wake-at", "second:wake-at", "typed:wake-at"]);
  });

  it("carries a program's facts with their own types, beside the house's", () => {
    const { bus, journal } = fixture();
    const totals: number[] = [];
    bus.on("sale-registered", event => {
      expectTypeOf(event.data).toEqualTypeOf<Readonly<{ sale: string; total: number }>>();
      totals.push(event.data.total);
    });
    const stored = bus.emit(sale);
    expectTypeOf(stored.data.total).toEqualTypeOf<number>();
    expectTypeOf(bus.emit(boot).kind).toEqualTypeOf<"boot">();
    expect(totals).toEqual([1500]);
    expect(stored).toMatchObject({ layer: "program", kind: "sale-registered", seq: 1, by: "ana" });
    expect(journal.replay<string[]>([], (layers, event) => [...layers, event.layer])).toEqual(["program", "house"]);
  });

  it("lets the house fold a journal that holds program facts without reading them", () => {
    const { bus, journal } = fixture();
    bus.emit(sale);
    const wake = bus.emit(effect("wake-at", { id: "turn", at: 200 }, "test"));
    bus.emit(shop.fact("payment-received", { payment: "p1", amount: 1500, sale: "s1" }, "ana"));
    const deadlines = journal.replay(new Map(), clockStep);
    expect([...deadlines]).toEqual([["turn", { at: 200, cause: wake.id, seq: 2 }]]);
    const untouched = new Map();
    expect(clockStep(untouched, bus.emit(sale))).toBe(untouched);
  });

  it("snapshots subscriptions per event and unsubscribes deterministically", () => {
    const { bus } = fixture();
    const seen: string[] = [];
    let off = () => {};
    bus.on(() => {
      off();
      bus.on("woke", () => seen.push("late"));
    });
    off = bus.on(() => seen.push("removed"));
    bus.emit(boot);
    bus.emit(effect("woke", { id: "turn" }, "test"));
    expect(seen).toEqual(["removed", "late"]);
  });

  it("delivers all committed facts before reporting observer failures", () => {
    const { bus, journal } = fixture();
    const seen: ShopEvent[] = [];
    bus.on("boot", event => {
      bus.emit(effect("woke", { id: "turn" }, "test", [event.id]));
      throw new Error("observer");
    });
    bus.on(event => seen.push(event));
    expect(() => bus.emit(boot)).toThrow(AggregateError);
    expect(seen.map(event => event.kind)).toEqual(["boot", "woke"]);
    expect(journal.replay<ShopEvent[]>([], (events, event) => [...events, event])).toEqual(seen);
    bus.emit(effect("woke", { id: "another" }, "test"));
    expect(seen).toHaveLength(3);
  });

  it("rejects invalid emissions of either layer before persistence or delivery", () => {
    const { bus, journal } = fixture();
    const seen: ShopEvent[] = [];
    bus.on(event => seen.push(event));
    expect(() => bus.emit(effect("wake-at", { id: "x", at: NaN }, "test"))).toThrow(
      "Invalid event envelope or unknown kind",
    );
    expect(() => bus.emit(shop.fact("sale-registered", { sale: "s1", total: -1 }, "ana"))).toThrow(
      "Invalid event envelope or unknown kind",
    );
    expect(seen).toEqual([]);
    expect(journal.replay(0, count => count + 1)).toBe(0);
    expect(bus.emit(boot).seq).toBe(1);
  });

  it("isolates the committed event from its caller and from every listener", () => {
    const { bus, journal } = fixture();
    const data = { id: "turn", at: 200 };
    const cause = ["source"];
    const event = bus.emit(effect("wake-at", data, "test", cause));
    data.at = 300;
    cause.push("changed");
    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event.data)).toBe(true);
    expect(Object.isFrozen(event.cause)).toBe(true);
    expect(journal.replay<ShopEvent[]>([], (events, stored) => [...events, stored])).toEqual([event]);
  });

  it("closes emission and subscription without another append", () => {
    const { bus, journal } = fixture();
    bus.close();
    bus.close();
    expect(() => bus.emit(boot)).toThrow("The event bus is closed");
    expect(() => bus.on(() => {})).toThrow("The event bus is closed");
    expect(journal.replay(0, count => count + 1)).toBe(0);
  });
});

describe("a journal's vocabulary", () => {
  const event = { seq: 1, id: "e", at: 100, layer: "house", kind: "boot", by: "test", cause: [], data: {} };
  const sold = { ...event, layer: "program", kind: "sale-registered", data: { sale: "s1", total: 10 } };

  it("reads the house's kinds and the program's, each in its own layer", () => {
    expect(shop.read(event)).toEqual(event);
    expect(shop.read(sold)).toEqual(sold);
    expect(layerOf("boot")).toBe("house");
    expect(layerOf("sale-registered")).toBe("program");
    expect(layerOf("toString")).toBe("program");
  });

  it("rejects unknown kinds, a kind in the wrong layer, extra properties and malformed envelopes", () => {
    for (const wrong of [
      { ...event, kind: "old.boot" },
      { ...event, layer: "program" },
      { ...sold, layer: "house" },
      { ...sold, data: { sale: "s1" } },
      { ...event, data: { unexpected: true } },
      { ...event, seq: 0 },
      { ...event, at: Infinity },
      { ...event, cause: "e" },
      { ...event, extra: true },
    ])
      expect(() => shop.read(wrong)).toThrow("Invalid event envelope or unknown kind");
  });

  it("reads only its own program: another program's kind is unknown to it", () => {
    const other = vocabulary({ "stock-counted": Type.Object({ units: Type.Integer() }) });
    const counted = { ...event, layer: "program", kind: "stock-counted", data: { units: 3 } };
    expect(other.read(counted)).toEqual(counted);
    expect(() => shop.read(counted)).toThrow("Invalid event envelope or unknown kind");
    expect(() => other.read(sold)).toThrow("Invalid event envelope or unknown kind");
  });

  it("refuses a program that takes a kind the house already writes, in types and when it runs", () => {
    const taken = { act: Type.Object({}), "stock-counted": Type.Object({}) };
    expectTypeOf(vocabulary<typeof taken>)
      .parameter(0)
      .toHaveProperty("act")
      .toEqualTypeOf<never>();
    const untyped: Catalog = taken;
    expect(() => vocabulary(untyped)).toThrow("act");
  });

  it("gives the house's reducers every event, whatever the program", () => {
    expectTypeOf<ShopEvent>().toExtend<Event>();
    expectTypeOf<Event>().not.toExtend<ShopEvent>();
  });
});
