import { performance } from "node:perf_hooks";
import { afterEach, expect, it, vi } from "vitest";
import { requestBudget } from "./request-budget.ts";
import { socketLimits } from "../wire/protocol.ts";
afterEach(() => vi.restoreAllMocks());
it("N8: a rolling second allows exactly 32 cheap requests per connection", () => {
  let now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  const budget = requestBudget();
  for (let i = 0; i < socketLimits.requests; i++) expect(budget.take(false)).toBe(true);
  expect(budget.take(false)).toBe(false);
  now = socketLimits.requestMs - 1;
  expect(budget.take(false)).toBe(false);
  expect(requestBudget().take(false)).toBe(true);
  now++;
  expect(budget.take(false)).toBe(true);
});
it("N8: eight live waits remain bounded across windows and release on completion", () => {
  let now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  const budget = requestBudget();
  for (let i = 0; i < socketLimits.waits; i++) expect(budget.take(true)).toBe(true);
  now += socketLimits.requestMs;
  expect(budget.take(true)).toBe(false);
  expect(budget.take(false)).toBe(true);
  budget.finish();
  expect(budget.take(true)).toBe(true);
  expect(budget.take(true)).toBe(false);
});
