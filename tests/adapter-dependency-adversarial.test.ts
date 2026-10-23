import assert from "node:assert/strict";
import test from "node:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { runWithVisualBoundaries } from "../src/authoring/visual-boundary/source.ts";

const constructions = {
  property: '(() => {}).constructor',
  element: '(() => {})["constructor"]',
  alias: '(() => {})[key]',
  reflect: 'Reflect.get(() => {}, "constructor")',
};
for (const [form, expression] of Object.entries(constructions)) {
test(`build rejects executable code obtained through a runtime function constructor: ${form}`, async () => {
  const root = resolve(import.meta.dirname, ".."), directory = mkdtempSync(join(tmpdir(), "desert-helper-constructor-"));
  const source = `const key = "constructor"; export const observe = () => (${expression})("document.body.textContent = 'Injected'")();`;
  // Independent execution witness: ordinary JS reaches drawing authority without
  // a Function/eval/globalThis identifier. This runs only in an isolated VM.
  const sandbox = { document: { body: { textContent: "Original" } } };
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText;
  runInNewContext(js.replace("export ", "") + "\nobserve();", sandbox);
  assert.equal(sandbox.document.body.textContent, "Injected");
  try {
    cpSync(join(root, "src"), join(directory, "src"), { recursive: true });
    const adapter = join(directory, "src/svelte/catalog/renderer/view-item/ViewItem.svelte");
    writeFileSync(adapter, readFileSync(adapter, "utf8").replace('<script lang="ts">',
      '<script lang="ts">\n import { observe } from "../../web/client/constructor-witness.ts"; observe();'));
    writeFileSync(join(directory, "src/web/client/constructor-witness.ts"), source);
    let invoked = false;
    await assert.rejects(runWithVisualBoundaries(directory, async () => { invoked = true; }), /NONVISUAL_DEPENDENCY/);
    assert.equal(invoked, false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
}

const unloadTraversals = {
  direct: 'window.addEventListener("beforeunload", event => { (event.currentTarget as Window).document.body.hidden = true; });',
  alias: 'window.addEventListener("beforeunload", event => { const host = event.currentTarget as Window; host.document.body.hidden = true; });',
  destructured: 'window.addEventListener("beforeunload", ({ currentTarget }) => { (currentTarget as Window).document.body.hidden = true; });',
  argument: 'const hide = (host: Window) => { host.document.body.hidden = true; }; window.addEventListener("beforeunload", event => hide(event.currentTarget as Window));',
  shadowed: 'const protect = (event: BeforeUnloadEvent) => event.preventDefault(); function register(protect: (event: BeforeUnloadEvent) => void) { window.addEventListener("beforeunload", protect); } register(event => { (event.currentTarget as Window).document.body.hidden = true; });',
};
for (const [form, extension] of Object.entries(unloadTraversals)) {
test(`the beforeunload host capability cannot write DOM through its event target: ${form}`, async () => {
  const root = resolve(import.meta.dirname, ".."), directory = mkdtempSync(join(tmpdir(), "desert-host-event-target-"));
  let callback: ((event: unknown) => void) | undefined;
  const host = { document: { body: { hidden: false } }, addEventListener: (_: string, listener: (event: unknown) => void) => { callback = listener; } };
  runInNewContext(ts.transpileModule(extension, { compilerOptions: { target: ts.ScriptTarget.ESNext } }).outputText, { window: host });
  callback!({ currentTarget: host });
  assert.equal(host.document.body.hidden, true);
  try {
    cpSync(join(root, "src"), join(directory, "src"), { recursive: true });
    const session = join(directory, "src/web/client/browser-session.ts");
    writeFileSync(session, readFileSync(session, "utf8") + "\n" + extension);
    let invoked = false;
    await assert.rejects(runWithVisualBoundaries(directory, async () => { invoked = true; }), /NONVISUAL_DEPENDENCY/);
    assert.equal(invoked, false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
}
