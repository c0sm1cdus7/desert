import { expect, it } from "vitest";
import { serialize, deserialize } from "node:v8";
import { statePatch, applyStatePatch } from "./state-patch.ts";
import { stateHash } from "./state-hash.ts";
import { stateReceiver } from "./state-receiver.ts";
it("maps preserve deletions, additions, changes and reordered keys, nested under tools", () => {
  const before = {
    tools: {
      shop: new Map([
        ["a", { n: 1 }],
        ["b", { n: 2 }],
      ]),
    },
  };
  for (const next of [
    new Map([
      ["b", { n: 3 }],
      ["c", { n: 4 }],
    ]),
    new Map([
      ["b", { n: 2 }],
      ["a", { n: 1 }],
    ]),
  ]) {
    const after = { tools: { shop: next } };
    const actual = applyStatePatch(before, statePatch(before, after));
    expect(actual).toEqual(after);
    expect(stateHash(actual)).toBe(stateHash(after));
  }
});
it("changed or shortened lists replace; a growing list sends only its suffix", () => {
  const before = [1, 2, 3];
  for (const after of [[1], [1, 7, 3], [1, 2, 3, 4]])
    expect(applyStatePatch(before, statePatch(before, after))).toEqual(after);
  expect(statePatch(before, [1, 2, 3, 4])).toEqual({ kind: "append", from: 3, values: [4] });
  expect(() => applyStatePatch([], { kind: "append", from: 3, values: [4] })).toThrow();
});
it("fingerprints preserve dates, sets, binary values and undefined independently of aliases", () => {
  const shared = { nested: new Set([1, 2]), date: new Date(1000), binary: Buffer.from([1, 2]), value: undefined };
  const a = { x: shared, y: shared };
  const b: unknown = deserialize(serialize({ x: shared, y: structuredClone(shared) }));
  // Buffer and Uint8Array are distinct wire values; compare identical v8 clones for alias independence.
  const c: unknown = deserialize(serialize(shared));
  expect(stateHash(a)).toBe(stateHash({ x: shared, y: c }));
  expect(stateHash(b)).not.toBe(stateHash(a));
});
it("a matching final hash cannot bypass the required base sequence", () => {
  const receiver = stateReceiver();
  const value = { through: 9 };
  const bytes = serialize({ kind: "put", value });
  receiver.begin({ tipo: "estado", seq: 9, ahora: 0, bytes: bytes.length, base: 8, huella: stateHash(value) });
  expect(() => receiver.accept(bytes, { through: 7 })).toThrow("State base mismatch");
});
