import { run, type RunOptions } from "node:test";
import type { TestEvent } from "node:test/reporters";
import { relative, resolve } from "node:path";
import { inspect } from "node:util";
import { sourceRoot } from "../../scripts/authoring-references.ts";
import type { CaseResult, NotebookEvidence } from "./report.ts";

export async function collectNotebookCases(options: RunOptions) {
  const cases: CaseResult[] = [];
  const execution: NotebookEvidence["execution"] = { completed: false, success: false };
  const stream = run({ cwd: sourceRoot, isolation: "process", concurrency: false, timeout: 30000, ...options });
  for await (const event of stream as AsyncIterable<TestEvent>) {
    if (event.type === "test:pass" || event.type === "test:fail") {
      const data = event.data;
      cases.push({ file: data.file ? relative(sourceRoot, resolve(data.file)) : "<unknown>", name: data.name,
        status: data.skip ? "skipped" : data.todo ? "todo" : event.type === "test:pass" ? "passed" : "failed",
        error: event.type === "test:fail" ? inspect(event.data.details.error, { depth: 4 }) : "" });
    }
    if (event.type === "test:summary" && !event.data.file) {
      execution.completed = true;
      execution.success = event.data.success;
    }
  }
  return { cases, execution };
}
