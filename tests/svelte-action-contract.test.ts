import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createBuildProject } from "../src/build/svelte/project.ts";

test("Svelte consumers cannot omit or invent Action icons", { timeout: 60000 }, async () => {
  const project = createBuildProject("export const surface = {}; export const validateInput = () => false;");
  const page = join(project.directory, "src/routes/+page.svelte");
  const header = '<script lang="ts">import Action from "@desert/svelte/pieces/Action.svelte";</script>\n';
  try {
    writeFileSync(page, header + '<Action label="Close" /><Action label="Save" icon="invented" />');
    await assert.rejects(project.run("check"), error => {
      const report = String(error);
      return report.includes("Property 'icon' is missing") && report.includes('"invented"');
    });
    writeFileSync(page, header + '<Action label="Close" icon="close" /><Action label="Save" icon="save" />');
    const checked = await project.run("check");
    assert.match(checked.stdout, /0 errors and 0 warnings/);
  } finally { project.close(); }
});
