// The one way a negative-suite case is asserted: a positive case builds; every other case is rejected with one of its codes.
import assert from "node:assert/strict";
import test from "node:test";
import { addedViolations, baselineOf, observeGate } from "./harness.ts";
import type { GateCase } from "./stage-a.cases.ts";

export function defineGateTests(cases: readonly GateCase[]): void {
  for (const gateCase of cases) {
    test(`${gateCase.id} ${gateCase.title}`, async () => {
      const [result, baseline] = await Promise.all([observeGate(gateCase.mutate, gateCase.mode), baselineOf(gateCase.mode)]);
      if (gateCase.kind === "positive") {
        // A legal tree builds, or (strict build, Q1) is refused only by content rules already refused in the unmutated
        // tree: never a structural rule, a crash, or a violation the mutation added.
        assert.ok(result.outcome === "built" || result.outcome === "rejected" && result.violations !== undefined, JSON.stringify(result).slice(0, 2000));
        const tolerated = new Set(gateCase.previousGateStricter ?? []);
        return assert.deepEqual((addedViolations(result, baseline) ?? []).filter(item => !tolerated.has(item.code)), [],
          "a legal mutation adds no violation");
      }
      if (result.outcome !== "rejected") assert.fail(`expected a rejection naming ${gateCase.expect.join(" or ")}; observed ${JSON.stringify(result).slice(0, 2000)}`);
      const added = addedViolations(result, baseline);
      if (added) {
        assert.ok(added.some(item => gateCase.expect.includes(item.code) && (gateCase.at === undefined || item.path === gateCase.at)),
          `expected a new ${gateCase.expect.join(" or ")}${gateCase.at ? ` at ${gateCase.at}` : ""}; the mutation added ${JSON.stringify(added).slice(0, 2000) || "nothing"}`);
        return;
      }
      assert.ok(gateCase.expect.some(code => new RegExp(`\\b${code}\\b`).test(result.message)),
        `expected ${gateCase.expect.join(" or ")}; observed ${result.message.slice(0, 2000)}`);
    });
  }
}
