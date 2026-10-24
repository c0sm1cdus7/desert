// The evidence project skips the gate only inside node:test, and the qualified build never imports it.
import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

test("outside node:test the evidence project refuses to run", async () => {
  const script = 'import { createEvidenceProject } from "./src/testing/evidence-project.ts"; createEvidenceProject("export {};\\n");';
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  await assert.rejects(promisify(execFile)(process.execPath, ["--input-type=module", "-e", script], { cwd: root, env }), /EVIDENCE_PROJECT_OUTSIDE_TESTS/);
});

test("the qualified build path does not import the evidence project", async () => {
  for (const path of ["src/build/svelte/project.ts", "src/build/svelte/builder.ts", "src/build/index.ts"]) {
    assert.doesNotMatch(await readFile(new URL(`../${path}`, import.meta.url), "utf8"), /(?:from|import\()\s*["'][^"']*testing\//, path);
  }
});
