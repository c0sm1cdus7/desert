import { expect, it, vi } from "vitest";
import { serialize, deserialize } from "node:v8";
import { execFileSync } from "node:child_process";
import { stateHash } from "./state-hash.ts";
import { statePatch, applyStatePatch } from "./state-patch.ts";
it("s02: equal numbers in integer and double fields have one fingerprint", () => {
  const sale = (amount: number) => ({ amount, name: "sale" });
  const fraction = sale(10.5);
  const integer = sale(1500);
  expect(fraction.amount).toBe(10.5);
  expect(stateHash(integer.amount)).toBe(stateHash(1500));
  expect(stateHash(integer)).toBe(stateHash(deserialize(serialize(integer))));
});
it("N06: object key order and aliases do not change the value", () => {
  const shared = { n: 21 };
  expect(stateHash({ z: shared, a: shared })).toBe(stateHash({ a: { n: 21 }, z: { n: 21 } }));
  expect(stateHash({ "2": 2, "10": 10, a: "\ud800" })).not.toBe(stateHash({ "2": 2, "10": 10, a: "�" }));
});
it("N04: equal reconstructed parts send no changes, including numeric storage and key order", () => {
  const before = { items: [{ n: 21 }], value: { a: 1, b: 2 } };
  const after = { value: { b: 2, a: 1 }, items: [{ n: 21 }] };
  expect(statePatch(before, after)).toEqual({ kind: "object", changes: [], remove: [] });
});
it.each([
  [0, -0],
  [-0, 0],
  [NaN, NaN],
  [Infinity, -Infinity],
])("numeric equality and patches agree: %s to %s", (a, b) => {
  const before = { n: a },
    after = { n: b };
  expect(stateHash(applyStatePatch(before, statePatch(before, after)))).toBe(stateHash(after));
});
it.each(["21,10.5", "10.5,21", "0,-0", "-0,0"])("s06: two processes accept full, delta and resync for %s", rates => {
  const path = "tests/support/state-values-process.ts";
  const frames = execFileSync(process.execPath, [path, "house", rates]);
  expect(execFileSync(process.execPath, [path, "terminal"], { input: frames }).toString().trim()).toBe("3 verified");
});
it("unchanged immutable parts are not walked again when a sibling changes", () => {
  const read = vi.fn(() => 21);
  const unchanged = {
    get rate() {
      return read();
    },
  };
  stateHash({ unchanged, other: 1 });
  const calls = read.mock.calls.length;
  stateHash({ unchanged, other: 2 });
  expect(read.mock.calls.length).toBe(calls);
});
it("floating arrays use canonical numeric values too", () => {
  expect(stateHash(new Float64Array([0, 21]))).toBe(stateHash(new Float64Array([-0, 21])));
  expect(stateHash(new Float32Array([0, 21]))).toBe(stateHash(new Float32Array([-0, 21])));
});
it("s01: sparse lists, special keys, nested sets and binary values round-trip and patch consistently", () => {
  const values: unknown[] = [
    [, 1],
    [undefined, 1],
    [],
    [1, 2, 3],
    [3, 2, 1],
    { a: undefined },
    {},
    JSON.parse('{"__proto__":{"n":1},"a.b":2,"c/d":3,"":4}'),
    new Set([{ n: 21 }, { n: 10.5 }]),
    new Date(1000),
    new Date(NaN),
    /a+/giu,
    new Float64Array([21, 10.5, -0, NaN]),
    Buffer.from([0, 255]),
    new Uint8Array([0, 255]),
    2n ** 70n,
    Number.MAX_VALUE,
    "\u0000\ud800 ñ € 😀",
    Object.assign(Object.create(null), { x: 1 }),
  ];
  for (const value of values) {
    expect(stateHash(deserialize(serialize(value)))).toBe(stateHash(value));
    for (const next of values) {
      const before = { value },
        after = { value: next };
      expect(stateHash(applyStatePatch(before, statePatch(before, after)))).toBe(stateHash(after));
    }
  }
});
