// Journal values keep the same recursive freezing behavior when shared with protected readings.
import { expect, it } from "vitest";
import { deepFreeze } from "./vocabulary.ts";

it("deepFreeze freezes nested objects and arrays, tolerates cycles and stops at frozen objects", () => {
  const row = { value: 1 };
  const nested = { rows: [row] };
  deepFreeze(nested);
  for (const value of [nested, nested.rows, nested.rows[0]]) expect(Object.isFrozen(value)).toBe(true);
  expect(() => {
    row.value = 2;
  }).toThrow(TypeError);
  const cycle: { self?: unknown } = {};
  cycle.self = cycle;
  expect(() => deepFreeze(cycle)).not.toThrow();
  expect(Object.isFrozen(cycle)).toBe(true);
  const already = Object.freeze({ child: {} });
  deepFreeze(already);
  expect(Object.isFrozen(already.child)).toBe(false);
  for (const value of [null, undefined, false, 0, "value"]) expect(() => deepFreeze(value)).not.toThrow();
});
