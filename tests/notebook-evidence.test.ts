import assert from "node:assert/strict";
import test from "node:test";
import { requiredNotebookCases } from "./notebook-evidence/required.ts";
import { requireNotebookEvidence, type NotebookEvidence } from "./notebook-evidence/report.ts";

const revision = "a".repeat(64);
// Synthetic report fixtures test rejection logic, not product execution.
function completeReport(): NotebookEvidence {
  return { format: "notebook.local-evidence/1", scope: "local-controller-sessions",
    revisionBefore: revision, revisionAfter: revision,
    runner: { node: "test", platform: "test", arch: "test", postgres: "test" },
    execution: { completed: true, success: true },
    cases: requiredNotebookCases.map(item => ({ ...item, status: "passed", error: "" })) };
}

test("Notebook evidence accepts exactly the required successful cases at the current revision", () => {
  assert.equal(requireNotebookEvidence(completeReport(), revision).passed, 34);
});

test("Notebook evidence rejects missing, duplicate and unknown cases even with a green summary", () => {
  for (const change of [
    (report: NotebookEvidence) => { report.cases.pop(); },
    (report: NotebookEvidence) => { report.cases.push(report.cases[0]!); },
    (report: NotebookEvidence) => { report.cases[0]!.name = "Unregistered replacement"; },
    (report: NotebookEvidence) => { report.cases[0]!.file = "another-test.ts"; },
  ]) {
    const report = completeReport();
    change(report);
    assert.throws(() => requireNotebookEvidence(report, revision), /INCOMPLETE_CASE_INVENTORY/);
  }
});

test("Notebook evidence rejects skipped, todo and failed obligations", () => {
  for (const status of ["skipped", "todo", "failed"] as const) {
    const report = completeReport();
    report.cases[0]!.status = status;
    assert.throws(() => requireNotebookEvidence(report, revision), /NON_PASSING_CASE/);
  }
});

test("Notebook evidence rejects unfinished, setup-blocked and unsuccessful executions", () => {
  const unfinished = completeReport();
  unfinished.execution.completed = false;
  assert.throws(() => requireNotebookEvidence(unfinished, revision), /INCOMPLETE_EXECUTION/);
  const blocked = completeReport();
  blocked.execution.success = false;
  assert.throws(() => requireNotebookEvidence(blocked, revision), /UNSUCCESSFUL_EXECUTION/);
});

test("Notebook evidence rejects a different source revision and edits during execution", () => {
  assert.throws(() => requireNotebookEvidence(completeReport(), "b".repeat(64)), /EVIDENCE_REVISION_MISMATCH/);
  const changed = completeReport();
  changed.revisionAfter = "b".repeat(64);
  assert.throws(() => requireNotebookEvidence(changed, revision), /REVISION_CHANGED_DURING_RUN/);
});
