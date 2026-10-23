import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { assertClosedVisualBoundaries } from "../src/authoring/visual-boundary/closed.ts";

const path = "src/svelte/catalog/renderer/bank-renderer/BankRenderer.svelte";
const original = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const owners = ["src/svelte/renderer-registry.ts", "src/svelte/renderer-contracts.ts"].map(path => ({
  path, source: readFileSync(new URL(`../${path}`, import.meta.url), "utf8"),
}));
const check = (source: string) => assertClosedVisualBoundaries([...owners, { path, source }]);

test("bank dispatch accepts the actual exhaustive registry and validated node without a source snapshot", () => {
  assert.doesNotThrow(() => check(original));
  assert.doesNotThrow(() => check(original.replace("import { webRenderers }", "import { webRenderers as Owners }")
    .replaceAll("webRenderers[", "Owners[").replaceAll("webRenderers.", "Owners.")
    .replaceAll("{@const Renderer", "<!-- owner dispatch -->\n{@const Renderer")));
});

test("bank dispatch cannot substitute an arbitrary component or skip node admission", () => {
  for (const source of [
    original.replace('"./renderer-registry.ts"', '"./foreign-registry.ts"'),
    original.replace("$derived(bankNode(node))", "$derived(node)"),
    original.replace("webRenderers[checked.kind]", "arbitrary"),
    original.replace("webRenderers.action", "webRenderers.problem"),
    original.replace("let checked =", "let other =") + '\n<Other/>',
    original.replace("</script>", 'import Other from "./Other.svelte";\n</script>') + '\n<Other/>',
    original + '\n<div>Foreign paint</div>',
    original + '\n{@html markup}',
    original.replace('<Renderer primitive={checked.kind}', '<Renderer style="color:red" primitive={checked.kind}'),
    original.replace('<Renderer primitive={checked.kind}', '<Renderer {...input} primitive={checked.kind}'),
  ]) assert.throws(() => check(source), /CLOSED_VISUAL_BOUNDARY/, source.slice(-160));
});

test("bank dispatch restricts privileged host channels to their canonical entries", () => {
  for (const source of [
    original.replace('elementProps={actionElementProps}', 'elementProps={{ style: "color:red" }}'),
    original.replace('host={fileHost()}', 'host={node}'),
    original.replace('{frameIdentity} onclose=', 'frameIdentity={node} onclose='),
    original.replace('state={checked.state} label={checked.label}', 'state={checked.state} label={checked.label} host={host}'),
    original.replace('</script>', 'const alias = webRenderers.action;\n</script>'),
    original.replace('label={checked.label} value={checked.value}', 'label={node.label} value={checked.value}'),
  ]) assert.throws(() => check(source), /CLOSED_VISUAL_BOUNDARY/);
});

test("the dispatcher must cover every catalog entry exactly once", () => {
  const branch = '{:else if checked.kind === "control.avatar"}';
  assert.throws(() => check(original.replace(branch, '{:else if checked.kind === "control.tag"}')), /CLOSED_VISUAL_BOUNDARY/);
  assert.throws(() => check(original.replace(branch, '{:else if checked.kind === "invented"}')), /CLOSED_VISUAL_BOUNDARY/);
});

test("dispatcher capabilities are received, never manufactured through destructuring defaults", () => {
  for (const [name, value] of [
    ["actionElementProps", '{ onclick: event => event.currentTarget.insertAdjacentText("beforeend", "Injected") }'],
    ["host", '{ read: () => undefined }'],
    ["frameIdentity", '{}'],
  ]) {
    const source = original.replace(` ${name},`, ` ${name} = ${value},`).replace(` ${name} }:`, ` ${name} = ${value} }:`);
    assert.notEqual(source, original, `${name} mutation must alter the actual source`);
    assert.throws(() => check(source), /manufactured dispatcher capability/, name);
  }
});

test("the registry is one frozen typed catalog, not a new executable selection layer", () => {
  const registry = owners.find(owner => owner.path.endsWith("renderer-registry.ts"))!;
  for (const source of [
    registry.source.replace("Object.freeze", "Object.assign"),
    registry.source.replace("action: Action,", "action: () => Action,"),
    registry.source.replace("action: Action,", "invented: Action,"),
    registry.source.replace("action: Action,", ""),
    registry.source.replace("action: Action,", "action: Action, action: Action,"),
    registry.source + '\nexport function select(component) { return component; }',
  ]) assert.throws(() => assertClosedVisualBoundaries([
    ...owners.filter(owner => owner !== registry), { ...registry, source }, { path, source: original },
  ]), /CLOSED_VISUAL_BOUNDARY/);
});
