import assert from "node:assert/strict";
import { caseKey, requiredNotebookCases } from "./required.ts";

export type CaseResult = {
  file: string, name: string, status: "passed" | "failed" | "skipped" | "todo",
  error: string,
};
export type NotebookEvidence = {
  format: "notebook.local-evidence/1", scope: "local-controller-sessions",
  revisionBefore: string, revisionAfter: string,
  runner: { node: string, platform: string, arch: string, postgres: string },
  execution: { completed: boolean, success: boolean }, cases: CaseResult[],
};

export function requireNotebookEvidence(report: NotebookEvidence, currentRevision: string) {
  assert.equal(report.format, "notebook.local-evidence/1", "UNSUPPORTED_EVIDENCE_FORMAT");
  assert.equal(report.scope, "local-controller-sessions", "EVIDENCE_SCOPE_MISMATCH");
  assert.match(currentRevision, /^[a-f0-9]{64}$/, "INVALID_REVISION");
  assert.equal(report.revisionBefore, currentRevision, "EVIDENCE_REVISION_MISMATCH");
  assert.equal(report.revisionAfter, currentRevision, "REVISION_CHANGED_DURING_RUN");
  assert.equal(report.execution.completed, true, "INCOMPLETE_EXECUTION");
  assert.equal(report.execution.success, true, "UNSUCCESSFUL_EXECUTION");
  assert.ok(report.cases.every(result => result.status === "passed"), "NON_PASSING_CASE");
  assert.deepEqual(report.cases.map(caseKey).sort(), requiredNotebookCases.map(caseKey).sort(), "INCOMPLETE_CASE_INVENTORY");
  return { scope: report.scope, revision: currentRevision, passed: report.cases.length };
}
