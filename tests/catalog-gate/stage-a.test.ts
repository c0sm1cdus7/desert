// Stage A of the negative suite. Escape cases are red at 572b30f by design: the gate lets them through.
// They turn green only when the finished gate rejects each one with its named code.
import assert from "node:assert/strict";
import test from "node:test";
import { observeGate } from "./harness.ts";
import { stageA } from "./stage-a.cases.ts";

for (const gateCase of stageA) {
  test(`${gateCase.id} ${gateCase.title}`, async () => {
    const result = await observeGate(gateCase.mutate, gateCase.mode);
    if (gateCase.kind === "positive") return assert.deepEqual(result, { outcome: "built" });
    if (result.outcome !== "rejected") assert.fail(`expected a rejection naming ${gateCase.expect.join(" or ")}; observed ${JSON.stringify(result)}`);
    assert.ok(gateCase.expect.some(code => new RegExp(`\\b${code}\\b`).test(result.message)),
      `expected ${gateCase.expect.join(" or ")}; observed ${result.message}`);
  });
}
