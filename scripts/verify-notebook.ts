import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { sourceRoot } from "./authoring-references.ts";
import { captureNotebookRevision } from "../tests/notebook-evidence/revision.ts";
import { collectNotebookCases } from "../tests/notebook-evidence/collect.ts";
import { notebookEvidenceFiles } from "../tests/notebook-evidence/required.ts";
import { requireNotebookEvidence, type NotebookEvidence } from "../tests/notebook-evidence/report.ts";

// This command verifies Notebook's local sessions, not SDK-wide conformance or UI.
const current = captureNotebookRevision();
if (process.argv[2] === "--check" && process.argv[3] && process.argv.length === 4) {
  const report = JSON.parse(readFileSync(resolve(process.argv[3]), "utf8")) as NotebookEvidence;
  console.log(requireNotebookEvidence(report, current.revision));
} else if (process.argv.length === 2) {
  const observed = await collectNotebookCases({ files: notebookEvidenceFiles });
  const report: NotebookEvidence = { format: "notebook.local-evidence/1", scope: "local-controller-sessions",
    revisionBefore: current.revision, revisionAfter: captureNotebookRevision().revision,
    runner: current.runner, ...observed };
  const directory = resolve(sourceRoot, "artifacts/notebook-evidence");
  mkdirSync(directory, { recursive: true });
  const path = resolve(directory, `${randomUUID()}.json`);
  writeFileSync(path, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(`Evidence: ${path}`);
  console.log(requireNotebookEvidence(report, captureNotebookRevision().revision));
} else throw new Error("Use no arguments to run, or --check REPORT to reject stale/incomplete evidence");
