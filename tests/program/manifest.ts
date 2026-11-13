// The parent summarizes occurrences once; each worker must see exactly that ordered list before registering.
import { createHash } from "node:crypto";
import type { Group } from "./registration.ts";
export function summarize(groups: readonly Group[]): string {
  return createHash("sha256")
    .update(JSON.stringify(groups.map(group => [group.name, group.checks.map(check => check.name)])))
    .digest("hex");
}
export function sameProgramList(groups: readonly Group[], expected: string): void {
  if (!expected) throw new Error("Missing program check list: configure tests/program/setup.ts as globalSetup");
  const actual = summarize(groups);
  if (actual !== expected)
    throw new Error(`Program check list changed before this part: expected ${expected}, got ${actual}`);
}
