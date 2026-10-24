// The evidence project skips the gate only inside node:test, and the qualified build never imports it.
import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

test("outside node:test the evidence project refuses to run", async () => {
  const script = 'import { createEvidenceProject } from "./src/testing/evidence-project.ts"; createEvidenceProject("export {};\\n");';
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  await assert.rejects(promisify(execFile)(process.execPath, ["--input-type=module", "-e", script], { cwd: root, env }), /EVIDENCE_PROJECT_OUTSIDE_TESTS/);
});

test("nothing outside tests imports the evidence project", async () => {
  const offenders: string[] = [];
  for (const folder of ["src", "products", "scripts"]) for (const entry of await readdir(join(root, folder), { recursive: true })) {
    if (!/\.(ts|mjs|js|svelte)$/.test(entry) || entry.endsWith("evidence-project.ts")) continue;
    const text = await readFile(join(root, folder, entry), "utf8");
    if (/(?:from|import\()\s*["'][^"']*evidence-project(?:\.ts)?["']/.test(text)) offenders.push(`${folder}/${entry}`);
  }
  assert.deepEqual(offenders, []);
});

test("the ungated project is private to the build module", async () => {
  const source = await readFile(join(root, "src/build/svelte/project.ts"), "utf8");
  assert.doesNotMatch(source, /export\s+(?:async\s+)?function\s+stageBuildProject/);
});
