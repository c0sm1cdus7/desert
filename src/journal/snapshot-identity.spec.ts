import { serialize } from "node:v8";
import { expect, it } from "vitest";
import { encodeFold, savedFold } from "./snapshot-format.ts";
import { ProjectionGroup } from "./projections.ts";

it("makes the format's single decision reject a different or missing calculation identity", () => {
  const bytes = encodeFold(1, 10, "program/1");
  expect(savedFold(bytes, 1, "program/1")?.state).toBe(10);
  expect(savedFold(bytes, 1, "program/2")).toBeUndefined();
  expect(savedFold(serialize({ version: 2, seq: 1, state: 10 }), 1, "program/1")).toBeUndefined();
});

it("resets every dependent fold if only one identity matches, even under unchanged names", () => {
  const group = new ProjectionGroup<{ seq: number }>();
  const a = group.add("a", 0, n => n + 2, encodeFold(1, 10, "old"), 1, "new");
  const b = group.add("b", 0, n => n + 3, encodeFold(1, 10, "new"), 1, "new");
  expect(group.after()).toBe(0);
  group.fold({ seq: 1 });
  expect([a(), b()]).toEqual([2, 3]);
});
