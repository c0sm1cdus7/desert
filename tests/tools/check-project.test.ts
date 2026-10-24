// svelte-check of the generated Notebook project through the test-only evidence project (plan 3.5, §6
// `--check-project`): the type contract of every piece and composition, while the strict build is red (Q1).
// Run: node --test tests/tools/check-project.test.ts   (or: node scripts/catalog-gate.ts --check-project)
import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../../src/index.ts";
import { buildHumanModule } from "../../src/web/build.ts";
import { createEvidenceProject } from "../../src/testing/evidence-project.ts";
import { NotebookProduct } from "../../products/notebook/product.ts";
import { NotebookWeb } from "../../products/notebook/distributions.ts";

test("the generated project type-checks with svelte-check", { timeout: 300_000 }, async () => {
  const project = createEvidenceProject(await buildHumanModule(compile(NotebookProduct), NotebookWeb.surface));
  try {
    const result = await project.run("check");
    assert.match(result.stdout, /svelte-check found 0 errors and 0 warnings/, result.stdout.slice(-2000));
    console.log(result.stdout.trim().split("\n").at(-1));
  } finally { project.close(); }
});
