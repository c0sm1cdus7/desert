import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import test from "node:test";
import ts from "typescript";
import { assertClosedVisualBoundaries } from "../src/authoring/visual-boundary/closed.ts";
import { inspectVisualSource } from "../src/authoring/visual-boundary/inspect.ts";

const workspace = "src/svelte/catalog/compositions/catalog-workspace/CatalogWorkspace.svelte";
const content = "src/svelte/catalog/compositions/catalog-workspace-content/CatalogWorkspaceContent.svelte";
const check = (path: string, source: string) => assertClosedVisualBoundaries([{ path, source }]);

test("the workspace has finite content data, never incoming render slots", () => {
  for (const source of [
    '<script>let {children}=$props();</script>{@render children()}',
    '<script>let {searchResults}=$props();</script>{@render searchResults()}',
    '<script>let {panels}=$props();</script>{#snippet overlay()}{@render panels()}{/snippet}',
    '<script>let {bottom}=$props();</script>{@render bottom()}',
    '<script>let {body}=$props();</script>{@html body}',
    '<script>let {props}=$props();</script><main {...props}/>',
  ]) assert.throws(() => check(workspace, source), /CLOSED_VISUAL_BOUNDARY/, source);
  for (const path of [workspace, content, "src/svelte/catalog/compositions/view-workspace/ViewWorkspace.svelte", "src/svelte/catalog/compositions/access-screen/AccessScreen.svelte"]) {
    const source = readFileSync(path, "utf8");
    assert.doesNotThrow(() => check(path, source), path);
  }
  assert.deepEqual(inspectVisualSource(content, readFileSync(content, "utf8")).findings, []);
  assert.deepEqual(inspectVisualSource("src/svelte/infra/workspace-content.ts", readFileSync("src/svelte/infra/workspace-content.ts", "utf8")).findings, []);
});

test("aliased workspace consumers cannot supply markup, geometry or a DOM binding", () => {
  const caller = "src/svelte/catalog/compositions/example/Example.svelte";
  const importOwner = `<script>import Shell from "${relative(dirname(caller), workspace)}";</script>`;
  assert.doesNotThrow(() => check(caller, importOwner + '<Shell content={body} onviewport={registerActions}/>'));
  for (const markup of [
    '<Shell><div>Foreign</div></Shell>', '<Shell children={foreign}/>', '<Shell style="padding:0"/>',
    '<Shell class="override"/>', '<Shell role="main"/>', '<Shell {...props}/>',
    '<Shell bind:viewport={element}/>', '<Shell bind:this={instance}/>',
    '<Shell>{#snippet searchResults()}<div>Foreign</div>{/snippet}</Shell>',
  ]) assert.throws(() => check(caller, importOwner + markup), /CLOSED_VISUAL_BOUNDARY/, markup);
  const importContent = `<script>import Body from "${relative(dirname(caller), content)}";</script>`;
  for (const markup of ['<Body children={foreign}/>', '<Body>{@render foreign()}</Body>', '<Body {...props}/>']) {
    assert.throws(() => check(caller, importContent + markup), /CLOSED_VISUAL_BOUNDARY/, markup);
  }
});

test("workspace body contracts reject arbitrary components, cross-kind data and DOM capabilities", () => {
  const fixture = resolve("tests/fixtures/workspace-content-types.ts");
  const expected = readFileSync(fixture, "utf8").split("\n")
    .flatMap((line, index) => line.includes("@ts-expect-error") ? [index + 1] : []);
  const configuration = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
  const { options } = ts.parseJsonConfigFileContent(configuration.config, ts.sys, process.cwd());
  const host = ts.createCompilerHost(options), read = host.readFile.bind(host);
  host.readFile = path => resolve(path) === fixture ? read(path)?.replace(/\/\/ @ts-expect-error[^\n]*/g, "") : read(path);
  const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([fixture], options, host));
  const actual = diagnostics.filter(item => item.file && resolve(item.file.fileName) === fixture)
    .map(item => item.file!.getLineAndCharacterOfPosition(item.start!).line);
  assert.deepEqual([...new Set(actual)].sort((a, b) => a - b), expected);
  const unrelated = diagnostics.filter(item => !item.file || resolve(item.file.fileName) !== fixture);
  assert.equal(unrelated.length, 0, ts.formatDiagnosticsWithColorAndContext(unrelated, {
    getCurrentDirectory: ts.sys.getCurrentDirectory, getCanonicalFileName: path => path, getNewLine: () => "\n",
  }));
});
