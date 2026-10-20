import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { sourceRoot } from "../scripts/authoring-references.ts";
import type { CaseResult } from "../src/testing/types.ts";

test("generic verification detects corrupt preservation, ownership and bypassed guards", { timeout: 120000 }, () => {
  const file = new URL("../src/local/effects.ts", import.meta.url);
  const original = readFileSync(file, "utf8");
  for (const mode of ["preservation", "owner", "guard"]) {
    const env: NodeJS.ProcessEnv = { ...process.env, DESERT_VERIFICATION_MUTATION: mode };
    delete env.NODE_TEST_CONTEXT;
    const result: { accepted: boolean, cases: CaseResult[] } = JSON.parse(execFileSync(process.execPath,
      ["--import", "./tests/fixtures/verification-mutation-hook.ts", "./tests/fixtures/verification-worker.ts"],
      { cwd: sourceRoot, env, encoding: "utf8", timeout: 35000, maxBuffer: 1024 * 1024 }));
    assert.equal(result.accepted, false, mode);
    assert.ok(result.cases.some(item => item.status === "passed"), "Mutation must not break the entire setup");
    const errors = result.cases.filter(item => item.status === "failed").map(item => item.reason).join("\n");
    assert.match(errors, mode === "guard" ? /Missing expected rejection/ : /PRESERVATION_VIOLATION/);
    assert.doesNotMatch(errors, /MUTATION_TARGET_CHANGED|UNKNOWN_VERIFICATION_MUTATION/);
  }
  assert.equal(readFileSync(file, "utf8"), original);
});
