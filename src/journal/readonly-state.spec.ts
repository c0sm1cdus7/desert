import { expect, it } from "vitest";
import { readonlyState, stateResult } from "./readonly-state.ts";
import { mutate } from "../../tests/support/state-mutations.ts";
it("refuses writes through objects, arrays, sets, dates, symbols and frozen property descriptors", () => {
  const symbol = Symbol("nested");
  const item = { n: 1 };
  const original = { list: [item], set: new Set([item]), date: new Date(0), [symbol]: item };
  const state = readonlyState(Object.freeze(original));
  for (const read of [() => state.list[0], () => [...state.set][0], () => state[symbol]]) {
    const part = read();
    if (!part) throw new Error("Missing test part");
    expect(() => Object.assign(part, { n: 2 })).toThrow(TypeError);
  }
  expect(() => state.list.push(item)).toThrow(TypeError);
  expect(() => state.set.add(item)).toThrow(TypeError);
  expect(() => Set.prototype.add.call(state.set, item)).toThrow(TypeError);
  expect(() => state.date.setTime(10)).toThrow(TypeError);
  expect(() => Date.prototype.setTime.call(state.date, 10)).toThrow(TypeError);
  expect(() => Object.defineProperty(state, "list", { value: [] })).toThrow(TypeError);
  expect(() => Object.preventExtensions(state)).toThrow(TypeError);
  expect(state.date.toISOString()).toBe("1970-01-01T00:00:00.000Z");
  expect(original.list).toEqual([{ n: 1 }]);
  expect(original.date.getTime()).toBe(0);
});
it("protects every map iterator, object keys, values, descriptors and the third forEach argument", () => {
  const key = { name: "key" },
    value = { n: 1 };
  const raw = new Map([[key, value]]);
  const map = readonlyState(raw);
  for (const entry of [map.entries(), map[Symbol.iterator]()]) {
    for (const [k, v] of entry) {
      expect(() => Object.assign(k, { name: "changed" })).toThrow(TypeError);
      expect(() => Object.assign(v, { n: 2 })).toThrow(TypeError);
      expect(map.get(k)).toBe(v);
      expect(map.has(k)).toBe(true);
    }
  }
  for (const k of map.keys()) expect(() => Object.assign(k, { name: "changed" })).toThrow(TypeError);
  for (const v of map.values()) expect(() => Object.assign(v, { n: 2 })).toThrow(TypeError);
  readonlyState(new Set([value])).forEach((v, k, set) => {
    expect(v).toBe(k);
    expect(() => Object.assign(v, { n: 2 })).toThrow(TypeError);
    expect(() => mutate(set, "clear")).toThrow(TypeError);
  });
  expect([...raw]).toEqual([[{ name: "key" }, { n: 1 }]]);
});
it("memoizes cycles and shared parts; returning reused parts keeps snapshots serializable", () => {
  const initial = { map: new Map<string, unknown>(), list: [{ n: 1 }] };
  initial.map.set("self", initial);
  const view = readonlyState(initial);
  expect(readonlyState(initial)).toBe(view);
  expect(readonlyState(view)).toBe(view);
  expect(view.map.get("self")).toBe(view);
  const next = stateResult({ ...view, map: new Map(view.map).set("next", view.list) });
  expect(() => structuredClone(next)).not.toThrow();
  expect(next.list).toBe(initial.list);
  expect(next.map.get("next")).toBe(initial.list);
});
it("owns a calculation's new result so a retained mutable alias cannot rewrite it later", () => {
  const returned = { map: new Map([["one", { n: 1 }]]), list: [1], date: new Date(0) };
  const kept = stateResult(returned);
  returned.map.clear();
  returned.list.push(2);
  returned.date.setTime(10);
  expect(kept.map.get("one")).toEqual({ n: 1 });
  expect(kept.list).toEqual([1]);
  expect(kept.date.getTime()).toBe(0);
});
it("a cold read over 20,000 entries visits no untouched part", () => {
  let visited = 0;
  const entries = Array.from({ length: 20_000 }, () => ({
    get data() {
      visited++;
      return { n: 1 };
    },
  }));
  const state = { entries, house: { admin: "ana" } };
  const view = readonlyState(state);
  expect(view.entries.length).toBe(20_000);
  expect(view.house.admin).toBe("ana");
  expect(visited).toBe(0);
  expect(view.entries[19_999]?.data.n).toBe(1);
  expect(visited).toBe(1);
});

it("protects extra data attached to a collection as deeply as its entries", () => {
  for (const collection of [new Map(), new Set()]) {
    const source = Object.assign(collection, { extra: { n: 1 } });
    const view = readonlyState(source);
    expect(() => Object.assign(view.extra, { n: 2 })).toThrow(TypeError);
    expect(source.extra.n).toBe(1);
  }
});
