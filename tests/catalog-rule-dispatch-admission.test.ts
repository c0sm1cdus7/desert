// Rule D2, the dispatcher's authority (dispatch-admission.ts), on the real NodeRenderer: ported from the previous gate's
// bank-dispatch-boundary tests. Each mutation of the real dispatcher must add a DISPATCHER_GRAMMAR violation (or, for a
// presentation escape on a mounted piece, rule E's); the real file adds nothing.
import assert from "node:assert/strict";
import test from "node:test";
import { ruleD2 } from "../src/authoring/catalog/gate/composition-dispatch.ts";
import { ruleE } from "../src/authoring/catalog/gate/presentation.ts";
import { DesertLayout } from "../src/authoring/catalog/layout.ts";
import { added, mutated, realSource } from "./support/real-tree.ts";

const path = "src/svelte/catalog/renderer/node-renderer/NodeRenderer.svelte";
const original = realSource(path);
const change = (source: string) => { assert.notEqual(source, original, "the mutation must change the real source"); return { [path]: source }; };
const grammar = (source: string) => added(ruleD2, change(source)).filter(line => line.startsWith("DISPATCHER_GRAMMAR"));

test("D2 control: the real dispatcher and a renamed table import add nothing", () => {
  assert.deepEqual(added(ruleD2, {}), []);
  const renamed = original.replace("import { nodeRenderers }", "import { nodeRenderers as Owners }").replaceAll("nodeRenderers[", "Owners[")
    .replaceAll("nodeRenderers.", "Owners.");
  assert.deepEqual(grammar(renamed), []);
});

test("D2: the dispatcher cannot substitute a component, a table or skip the admission of its node", () => {
  for (const source of [
    original.replace('"../../../renderer-registry.ts"', '"../../../foreign-registry.ts"'),
    original.replace("$derived(resolvedNode(node))", "$derived(node)"),
    original.replace("nodeRenderers[checked.kind]", "arbitrary"),
    original.replace("nodeRenderers.action", "nodeRenderers.problem"),
    original.replace("let checked =", "let other ="),
    original.replace("</script>", 'import Other from "./Other.svelte";\n</script>') + "\n<Other/>",
    `${original}\n<div>Foreign paint</div>`,
    `${original}\n{@html markup}`,
    original.replace("<Renderer primitive={checked.kind}", "<Renderer {...input} primitive={checked.kind}"),
  ]) assert.notDeepEqual(grammar(source), [], source.slice(-200));
  assert.notDeepEqual(added(ruleE, change(original.replace("<Renderer primitive={checked.kind}", '<Renderer style="color:red" primitive={checked.kind}'))), []);
});

test("D2: a private host capability reaches only its own kind, as received", () => {
  for (const source of [
    original.replace("elementProps={actionElementProps}", 'elementProps={{ style: "color:red" }}'),
    original.replace("host={fileHost()}", "host={node}"),
    original.replace("{frameIdentity} onclose=", "frameIdentity={node} onclose="),
    original.replace("state={checked.action.state}", "state={checked.action.state} host={fileHost()}"),
    original.replace("</script>", "const alias = nodeRenderers.action;\n</script>"),
    original.replace("label={checked.label} value={checked.value}", "label={node.label} value={checked.value}"),
  ]) assert.notDeepEqual(grammar(source), [], source.slice(0, 120));
});

test("D2: every resolved node kind has exactly one branch", () => {
  const branch = '{:else if checked.kind === "control.avatar"}';
  assert.ok(grammar(original.replace(branch, '{:else if checked.kind === "control.tag"}')).some(line => line.includes('"control.tag" dispatched twice')));
  assert.ok(grammar(original.replace(branch, '{:else if checked.kind === "invented"}')).some(line => line.includes('"invented" is not a resolved node kind')));
  assert.ok(grammar(original.replace(branch, '{:else if checked.kind === "invented"}')).some(line => line.includes('"control.avatar" has no branch')));
});

test("D2: a capability is received, never manufactured through a destructuring default", () => {
  for (const [name, value] of [["actionElementProps", "{}"], ["host", "{ read: () => undefined }"], ["frameIdentity", "{}"]] as const) {
    const source = original.replace(` ${name},`, ` ${name} = ${value},`).replace(` ${name} }:`, ` ${name} = ${value} }:`);
    assert.ok(grammar(source).some(line => line.includes(`manufactured dispatcher capability: ${name}`)), name);
  }
});

test("D2: the script neither shadows, mutates nor asserts over the dispatcher's authority", () => {
  for (const [source, what] of [
    [original.replace("function fileHost()", "function shadow(checked: unknown) { return checked; }\n  function fileHost()"), "checked is shadowed"],
    [original.replace("function fileHost()", "function poke() { checked = node; }\n  function fileHost()"), "checked is mutated"],
    [original.replace("function fileHost()", "const forced = checked as never;\n  function fileHost()"), "a type assertion"],
    [original.replace("function fileHost()", "const table = nodeRenderers;\n  function fileHost()"), "nodeRenderers is read in the script"],
  ] as const) assert.ok(grammar(source).some(line => line.includes(what)), what);
});

test("D2: the admission comes from the layout, not from the rule", () => {
  assert.deepEqual(DesertLayout.dispatch["resolved-node"], { input: "node", validator: { module: "src/interaction/resolved-node.ts", name: "resolvedNode" } });
  assert.ok(grammar(mutated(path, "import { resolvedNode }", "import { controlResolvedNode as resolvedNode }")[path] ?? "")
    .some(line => line.includes("unvalidated input")));
});
