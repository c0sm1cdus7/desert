import assert from "node:assert/strict";
import test from "node:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { assertNonvisualDependencies } from "../src/authoring/visual-boundary/dependency-graph.ts";
import { readVisualBoundarySources, runWithVisualBoundaries } from "../src/authoring/visual-boundary/source.ts";

const root = resolve(import.meta.dirname, "..");
async function candidate(change: (directory: string) => void, expected: RegExp) {
  const directory = mkdtempSync(join(tmpdir(), "desert-interpreter-boundary-"));
  try {
    cpSync(join(root, "src"), join(directory, "src"), { recursive: true });
    change(directory);
    let invoked = false;
    await assert.rejects(runWithVisualBoundaries(directory, async () => { invoked = true; }), expected);
    assert.equal(invoked, false, "A nonvisual violation must stop the actual build worker");
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

test("every interpreter file is checked independently of sealed adapter reachability", async () => {
  const sources = await readVisualBoundarySources(root);
  const checked = await assertNonvisualDependencies(root, sources);
  const interpreter = readdirSync(join(root, "src/web/client"), { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile()).map(entry => relative(root, join(entry.parentPath, entry.name)));
  assert.ok(interpreter.length > 20);
  for (const path of interpreter) assert.ok(checked.includes(path), `Interpreter omitted: ${path}`);
  assert.ok(checked.includes("src/web/client/browser-session.ts"));
  assert.ok(checked.includes("src/web/client/model.ts"));
  assert.ok(checked.includes("src/web/client/view-program.ts"));
});

test("dormant and nested interpreter helpers cannot obtain drawing authority", async () => {
  for (const path of ["dormant.ts", "nested/dormant.ts", "dormant.js"]) await candidate(directory => {
    const target = join(directory, "src/web/client", path);
    mkdirSync(resolve(target, ".."), { recursive: true });
    writeFileSync(target, 'export const observe = () => { document.body.textContent = "Injected"; };');
  }, /NONVISUAL_DEPENDENCY: src\/web\/client\/.*dormant\.(ts|js): visual runtime global/);
});

test("a catalog owner importing an interpreter helper does not grant the helper visual authority", async () => {
  await candidate(directory => {
    const owner = join(directory, "src/svelte/pieces/ViewProductContent.svelte");
    writeFileSync(owner, readFileSync(owner, "utf8").replace('<script lang="ts">',
      '<script lang="ts">\n import { observe } from "../../web/client/owner-helper.ts"; observe();'));
    writeFileSync(join(directory, "src/web/client/owner-helper.ts"),
      'export const observe = () => { document.body.hidden = true; };');
  }, /NONVISUAL_DEPENDENCY: src\/web\/client\/owner-helper.ts: visual runtime global/);
});

test("dormant interpreter imports still traverse the complete nonvisual dependency chain", async () => {
  await candidate(directory => {
    writeFileSync(join(directory, "src/web/client/dormant.ts"), 'export { observe } from "../../dormant-helper.ts";');
    writeFileSync(join(directory, "src/dormant-helper.ts"), 'export const observe = () => document.body.hidden = true;');
  }, /NONVISUAL_DEPENDENCY: src\/dormant-helper.ts: visual runtime global/);
});

test("unrecognized interpreter source formats and symlinked files or directories fail closed", async () => {
  await candidate(directory => {
    writeFileSync(join(directory, "src/web/client/dormant.tsx"), 'export const view = <div>Injected</div>;');
  }, /NONVISUAL_DEPENDENCY: .*unregistered interpreter source/);
  for (const directoryLink of [false, true]) await candidate(directory => {
    const target = join(directory, "src/web/client", directoryLink ? "linked" : "linked.ts");
    symlinkSync(join(root, directoryLink ? "src/web/client" : "src/web/client/model.ts"), target);
  }, /NONVISUAL_DEPENDENCY: .*symlinked interpreter source/);
});
