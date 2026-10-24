import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
// svelte-check of the generated project, not the gate: the test-only evidence project (plan 3.5) while the strict build is red.
import { createEvidenceProject } from "../src/testing/evidence-project.ts";

const header = `<script lang="ts">
  import type { Component } from "svelte";
  import { nodeRenderers } from "@desert/svelte/renderer-registry.ts";
  import type { NodeRendererTable, NodeRendererInputs, ControlEventFor } from "@desert/svelte/renderer-contracts.ts";
  import type { ControlEvent } from "@desert/interaction/control-nodes.ts";
  import SelectControl from "@desert/svelte/catalog/compositions/select-control/SelectControl.svelte";
  import DateControl from "@desert/svelte/catalog/foundations/date-control/DateControl.svelte";
  const date: NodeRendererInputs["control.date"]["node"] = {
    version: "desert.control/1", kind: "date", id: "date", label: "Date", disabled: false, required: false, value: null,
  };
  const choice: NodeRendererInputs["control.select"]["node"] = {
    version: "desert.control/1", kind: "select", id: "select", label: "Choice", disabled: false,
    required: false, value: null, options: [{ value: "one", label: "One", disabled: false }],
  };
  const acceptAll = (_event: ControlEvent) => {};
  const acceptSelection = (_event: ControlEventFor<"select">) => {};
  const unrelated: Component<{ arbitrary: string }> = () => ({});
  const wrongEmitter: Component<{ node: NodeRendererInputs["control.date"]["node"]; onevent: (event: ControlEventFor<"select">) => void }> = () => ({});
  const { "control.date": Date, "control.select": Select, "input.text": Text, "input.multiline": Multiline } = nodeRenderers;
`;

test("Svelte bank rejects wrong components, nodes, events and inventory; compatible bindings pass", { timeout: 60000 }, async () => {
  const project = createEvidenceProject("export const surface = {}; export const validateInput = () => false;");
  const page = join(project.directory, "src/routes/+page.svelte");
  const negatives = [
    'const wrongComponent: NodeRendererTable = { ...nodeRenderers, "control.date": SelectControl };',
    'const wrongLegacyComponent: NodeRendererTable = { ...nodeRenderers, action: DateControl };',
    'const arbitraryComponent: NodeRendererTable = { ...nodeRenderers, action: unrelated };',
    'const wrongEventBinding: NodeRendererTable = { ...nodeRenderers, "control.date": wrongEmitter };',
    'const wrongNode: NodeRendererInputs["control.date"] = { node: choice, onevent: acceptAll };',
    'const wrongEvent: NodeRendererInputs["control.date"] = { node: date, onevent: acceptSelection };',
    'const incompleteInventory: NodeRendererTable = { "control.date": DateControl };',
    'const inventedEntry: NodeRendererTable = { ...nodeRenderers, rainbow: DateControl };',
    'const wrongInput: NodeRendererInputs["input.text"]["primitive"] = "input.multiline";',
    'const numericHelper: NodeRendererInputs["input.text"] = { primitive: "input.text", label: "Name", helper: 12, onchange: () => {} };',
    'const callableHelper: NodeRendererInputs["input.multiline"] = { primitive: "input.multiline", label: "Description", helper: () => "Not plain text", onchange: () => {} };',
    'const foreignInputProp: NodeRendererInputs["input.text"] = { primitive: "input.text", label: "Name", style: "color:red", onchange: () => {} };',
    'const wrongEmittedEvent: ControlEventFor<"date"> = { kind: "select.change", control: "date", value: null };',
  ];
  try {
    const wrongUses = ['<Date node={choice} onevent={acceptAll} />', '<Date node={date} onevent={acceptSelection} />'];
    const negativeSource = header + negatives.join("\n") + '\n</script>\n' + wrongUses.join("\n");
    const expectedLines = [...negatives, ...wrongUses].map(line => negativeSource.split("\n").indexOf(line) + 1);
    writeFileSync(page, negativeSource);
    await assert.rejects(project.run("check"), error => {
      const report = String(error);
      const actualLines = report.split("\n").filter(line => line.startsWith(`${page}:`))
        .map(line => Number(line.match(/:(\d+):\d+$/)?.[1]));
      assert.deepEqual([...new Set(actualLines)], expectedLines, report);
      return true;
    });
    writeFileSync(page, header + `
      const completeInventory: NodeRendererTable = nodeRenderers;
      const dateBinding: Component<NodeRendererInputs["control.date"]> = DateControl;
      const selectionBinding: Component<NodeRendererInputs["control.select"]> = SelectControl;
      const dateEvent: ControlEventFor<"date"> = { kind: "date.change", control: date.id, value: null };
      const textInput: NodeRendererInputs["input.text"] = { primitive: "input.text", label: "Name", helper: "Use a recognizable name.", onchange: () => {} };
      const multilineInput: NodeRendererInputs["input.multiline"] = { primitive: "input.multiline", label: "Description", helper: "Describe the image.", onchange: () => {} };
    </script>
    <Date node={date} onevent={acceptAll} /><Select node={choice} onevent={acceptAll} />
    <Text {...textInput}/><Multiline {...multilineInput}/>`);
    const checked = await project.run("check");
    assert.match(checked.stdout, /0 errors and 0 warnings/);
  } finally { project.close(); }
});
