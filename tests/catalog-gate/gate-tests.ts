// The one way a negative-suite case is asserted: a positive case builds; every other case is rejected with one of its codes.
import assert from "node:assert/strict";
import test from "node:test";
import { observeGate } from "./harness.ts";
import type { GateCase } from "./stage-a.cases.ts";

export function defineGateTests(cases: readonly GateCase[]): void {
  for (const gateCase of cases) {
    test(`${gateCase.id} ${gateCase.title}`, async () => {
      const result = await observeGate(gateCase.mutate, gateCase.mode);
      if (gateCase.kind === "positive") return assert.deepEqual(result, { outcome: "built" });
      if (result.outcome !== "rejected") assert.fail(`expected a rejection naming ${gateCase.expect.join(" or ")}; observed ${JSON.stringify(result)}`);
      assert.ok(gateCase.expect.some(code => new RegExp(`\\b${code}\\b`).test(result.message)),
        `expected ${gateCase.expect.join(" or ")}; observed ${result.message}`);
    });
  }
}
