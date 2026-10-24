import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
// svelte-check of the generated project, not the gate: the test-only evidence project (plan 3.5) while the strict build is red.
import { createEvidenceProject } from "../src/testing/evidence-project.ts";

test("a generated build rejects invalid semantic prop values before producing an artifact", { timeout: 120000 }, async () => {
  const project = createEvidenceProject("export const surface = {}; export const validateInput = () => false;");
  const page = join(project.directory, "src/routes/+page.svelte");
  const header = '<script lang="ts">import { TextContent } from "@desert/svelte/catalog/index.ts";</script>\n';
  try {
    writeFileSync(page, header + '<TextContent text={42}/>');
    await assert.rejects(project.run("build"), error => {
      const report = String(error);
      assert.match(report, /SVELTE_BUILD_FAILED/);
      assert.ok(report.includes(`${page}:2:`), report);
      assert.match(report, /Type 'number' is not assignable to type 'string'/);
      return true;
    });
    assert.equal(existsSync(join(project.directory, "build")), false,
      "a type-invalid component must not reach artifact emission");

    writeFileSync(page, header + '<TextContent text="Notes"/>');
    const checked = await project.run("check");
    assert.equal(checked.stdout.match(/svelte-check found 0 errors and 0 warnings/g)?.length, 1,
      "explicit checking runs the type checker exactly once");
    assert.equal(existsSync(join(project.directory, "build")), false, "checking does not also build");

    const built = await project.run("build");
    assert.equal(built.stdout.match(/svelte-check found 0 errors and 0 warnings/g)?.length, 1,
      "the central build runs the type checker exactly once before Vite");
    assert.equal(existsSync(join(project.directory, "build")), true);
  } finally { project.close(); }
});
