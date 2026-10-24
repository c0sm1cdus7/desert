import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
// svelte-check of the generated project, not the gate: the test-only evidence project (plan 3.5) while the strict build is red.
import { createEvidenceProject } from "../src/testing/evidence-project.ts";

test("Svelte consumers cannot omit or invent Action icons", { timeout: 60000 }, async () => {
  const project = createEvidenceProject("export const surface = {}; export const validateInput = () => false;");
  const page = join(project.directory, "src/routes/+page.svelte");
  const header = '<script lang="ts">import Action from "@desert/svelte/catalog/foundations/action/Action.svelte";</script>\n';
  // Every other prop of the closed contract is present, so the icon is the only one missing.
  const rest = 'state="ready" emphasis="secondary" face="fit" type="button"';
  try {
    writeFileSync(page, header + `<Action label="Close" ${rest} /><Action label="Save" icon="invented" ${rest} />`);
    await assert.rejects(project.run("check"), error => {
      const report = String(error);
      return report.includes("Property 'icon' is missing") && report.includes('"invented"');
    });
    writeFileSync(page, header + `<Action label="Close" icon="close" ${rest} /><Action label="Save" icon="save" ${rest} />`);
    const checked = await project.run("check");
    assert.match(checked.stdout, /0 errors and 0 warnings/);
  } finally { project.close(); }
});
