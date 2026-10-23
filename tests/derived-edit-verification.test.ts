import assert from "node:assert/strict";
import test from "node:test";
import { deriveVerification } from "../src/testing/index.ts";
import { localPostgresTestHost } from "../src/testing/postgres.ts";
import { EditingNotebook, EditNote } from "./fixtures/editing-notebook.ts";

test("derived verification carries observed edit revisions through all update obligations", { timeout: 90000 }, async () => {
  const verification = deriveVerification(EditingNotebook);
  const report = await verification.run({ host: localPostgresTestHost(), seed: 42 });
  assert.deepEqual(report.cases.filter(item => item.status !== "passed"), []);
  const editing = report.cases.filter(item => item.journeyId === EditNote.id);
  assert.equal(editing.length, 14, "Every editing obligation runs on human and agent exposure");
  assert.deepEqual([...new Set(editing.map(item => item.obligation))].sort(),
    ["atomicity", "authority", "concurrency", "guards", "inputs", "recovery", "success"]);
  verification.assertComplete(report);
});
