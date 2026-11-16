// A rejection has no effects and carries the original reason on each independent decision.
import { expect, it } from "vitest";
import { rejected } from "./perform-act.ts";

it("rejected preserves the reason and supplies fresh empty effects for each decision", () => {
  const reason = "No se puede continuar";
  const first = rejected(reason);
  expect(first).toEqual({ status: "rejected", reason, effects: [] });
  expect(rejected("")).toEqual({ status: "rejected", reason: "", effects: [] });
  const second = rejected(reason);
  expect(second).not.toBe(first);
  expect(second.effects).not.toBe(first.effects);
});
