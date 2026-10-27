// Records what the checkpoint gate does with every Stage A case. Evidence only: nothing reads the file.
// Usage: node tests/tools/record-gate-baseline.ts <output.md>
import { writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { observeGate } from "../catalog-gate/harness.ts";
import { stageA } from "../catalog-gate/stage-a.cases.ts";

const output = process.argv[2];
if (!output) throw new Error("RECORD_BASELINE_USAGE: <output.md>");
const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const cell = (text: string) => text.replaceAll("|", "\\|").replaceAll("\n", " ").slice(0, 220);
const rows: string[] = [];
for (const gateCase of stageA) {
  const result = await observeGate(gateCase.mutate, gateCase.mode);
  const observed = result.outcome === "built" ? "built (escape passes)" : `${result.outcome}: ${cell(result.message)}`;
  rows.push(`| ${gateCase.id} | ${gateCase.kind} | ${cell(gateCase.title)} | ${gateCase.expect.join(" / ") || "built"} | ${observed} |`);
  console.log(`${gateCase.id} ${result.outcome}`);
}
await writeFile(output, [
  `# Stage A baseline at ${commit}`, "",
  `Recorded ${new Date().toISOString()} with node ${process.version}. The gate of each copied tree checks that tree.`,
  "Escape cases are expected to be built here; controls are expected to be rejected.", "",
  "| Id | Kind | Mutation | Required code after slice 1 | Observed at this commit |",
  "| --- | --- | --- | --- | --- |", ...rows, "",
].join("\n"));
