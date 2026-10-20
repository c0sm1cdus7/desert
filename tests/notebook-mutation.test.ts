import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { sourceRoot } from "../scripts/authoring-references.ts";
import { captureNotebookRevision, revisionDigest } from "./notebook-evidence/revision.ts";
import { requireNotebookEvidence, type NotebookEvidence } from "./notebook-evidence/report.ts";

function observe(mode: string): Pick<NotebookEvidence, "cases" | "execution"> {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  return JSON.parse(execFileSync(process.execPath, ["tests/fixtures/collect-notebook-worker.ts", mode],
    { cwd: sourceRoot, env, encoding: "utf8", timeout: 20000, maxBuffer: 1024 * 1024 }));
}

test("preservation succeeds normally and kills a real interpreter mutation, without editing source", () => {
  const path = new URL("../src/local/effects.ts", import.meta.url);
  const source = readFileSync(path, "utf8");
  const control = observe("control");
  assert.deepEqual(control.execution, { completed: true, success: true });
  assert.equal(control.cases.length, 2);
  assert.ok(control.cases.every(result => result.status === "passed"));
  const mutant = observe("mutant");
  assert.deepEqual(mutant.execution, { completed: true, success: false });
  assert.equal(mutant.cases.length, 2);
  for (const result of mutant.cases) {
    assert.equal(result.status, "failed");
    assert.match(result.error, /ARCHIVE_PRESERVATION_VIOLATION/);
    assert.match(result.error, /Corrupted by interpreter/);
    assert.doesNotMatch(result.error, /FIXTURE_PRECONDITION|MUTATION_TARGET_CHANGED/);
  }
  assert.equal(readFileSync(path, "utf8"), source);
});

test("real skipped, undiscovered and setup-blocked cases cannot satisfy Notebook evidence", () => {
  const snapshot = captureNotebookRevision();
  for (const mode of ["skip", "missing", "blocked"]) {
    const observed = observe(mode);
    if (mode === "skip") assert.ok(observed.cases.some(result => result.status === "skipped"));
    if (mode === "missing") assert.equal(observed.cases.length, 1);
    if (mode === "blocked") {
      assert.equal(observed.execution.success, false);
      assert.ok(observed.cases.every(result => /FIXTURE_SETUP_BLOCKED/.test(result.error)));
    }
    const report: NotebookEvidence = { format: "notebook.local-evidence/1", scope: "local-controller-sessions",
      revisionBefore: snapshot.revision, revisionAfter: snapshot.revision, runner: snapshot.runner, ...observed };
    assert.throws(() => requireNotebookEvidence(report, snapshot.revision),
      /NON_PASSING_CASE|INCOMPLETE_CASE_INVENTORY|UNSUCCESSFUL_EXECUTION/);
  }
});

test("revision changes with interpreter, expectations, fixtures, lockfile or runtime even if contract does not", () => {
  const snapshot = captureNotebookRevision();
  for (const path of ["src/local/effects.ts", "tests/notebook-preservation.test.ts",
    "tests/fixtures/journey-runtime.ts", "scripts/verify-notebook.ts", "package-lock.json"]) {
    assert.ok(snapshot.files[path], `Missing revision input: ${path}`);
    assert.notEqual(revisionDigest({ ...snapshot.files, [path]: "changed" }, snapshot.runner), snapshot.revision);
  }
  assert.notEqual(revisionDigest(snapshot.files, { ...snapshot.runner, node: "different" }), snapshot.revision);
});
