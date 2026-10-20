import assert from "node:assert/strict";
import test from "node:test";
import { deriveVerification } from "../src/testing/index.ts";
import { Notebook } from "../products/notebook/product.ts";
import { SharedProduct } from "./fixtures/shared-controller.ts";
import { localPostgresTestHost } from "../src/testing/postgres.ts";

for (const product of [Notebook, SharedProduct]) {
  test(`verification derives every exposed entry of ${product.id}`, () => {
    const verification = deriveVerification(product);
    const expected = product.surfaces.flatMap(surface =>
      surface.journeys.map(journey => JSON.stringify([surface.id, journey])));
    const actual = verification.cases.map(item => JSON.stringify([item.surfaceId, item.journeyId]));
    assert.deepEqual([...new Set(actual)].sort(), expected.sort());
    for (const journey of product.journeys) {
      assert.ok(verification.cases.some(item => item.journeyId === journey.id && item.obligation === "success"));
    }
  });
  test(`derived obligations execute against PostgreSQL for ${product.id}`, { timeout: 90000 }, async () => {
    const verification = deriveVerification(product);
    const report = await verification.run({ host: localPostgresTestHost(), seed: 42 });
    assert.deepEqual(report.cases.filter(item => item.status !== "passed"), []);
    verification.assertComplete(report);
    assert.equal(report.cases.length, verification.cases.length);
    assert.throws(() => verification.assertComplete({ ...report, cases: report.cases.slice(1) }), /INCOMPLETE_CASE_INVENTORY/);
    assert.throws(() => verification.assertComplete({ ...report, completed: false }), /INCOMPLETE_EXECUTION/);
    assert.throws(() => verification.assertComplete({ ...report, contractDigest: "old" }), /CONTRACT_REVISION_MISMATCH/);
    assert.throws(() => verification.assertComplete({ ...report, revisionBefore: "old" }), /MECHANISM_REVISION_MISMATCH/);
    assert.throws(() => verification.assertComplete({ ...report, cases: report.cases.map(item => ({ ...item, status: "blocked" })) }),
      /UNSATISFIED_OBLIGATIONS/);
    assert.throws(() => verification.assertComplete({ ...report }), /UNRECOGNIZED_EXECUTION_REPORT/);
    assert.equal(Object.isFrozen(report.cases), true);
  });
}
