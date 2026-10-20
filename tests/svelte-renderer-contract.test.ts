import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createBuildProject } from "../src/build/svelte/project.ts";

const header = `<script lang="ts">
  import type { Component } from "svelte";
  import { webRenderers } from "@desert/svelte/renderer-registry.ts";
  import type { WebRendererBank, WebRendererProps, ControlEventFor } from "@desert/svelte/renderer-contracts.ts";
  import type { ControlEvent } from "@desert/interaction/control-nodes.ts";
  import SelectControl from "@desert/svelte/controls/SelectControl.svelte";
  import DateControl from "@desert/svelte/controls/DateControl.svelte";
  const date: WebRendererProps["control.date"]["node"] = {
    version: "desert.control/1", kind: "date", id: "date", label: "Date", disabled: false, required: false, value: null,
  };
  const choice: WebRendererProps["control.select"]["node"] = {
    version: "desert.control/1", kind: "select", id: "select", label: "Choice", disabled: false,
    required: false, value: null, options: [{ value: "one", label: "One", disabled: false }],
  };
  const acceptAll = (_event: ControlEvent) => {};
  const acceptSelection = (_event: ControlEventFor<"select">) => {};
  const unrelated: Component<{ arbitrary: string }> = () => ({});
  const wrongEmitter: Component<{ node: WebRendererProps["control.date"]["node"]; onevent: (event: ControlEventFor<"select">) => void }> = () => ({});
  const { "control.date": Date, "control.select": Select } = webRenderers;
`;

test("Svelte bank rejects wrong components, nodes, events and inventory; compatible bindings pass", { timeout: 60000 }, async () => {
  const project = createBuildProject("export const surface = {}; export const validateInput = () => false;");
  const page = join(project.directory, "src/routes/+page.svelte");
  const negatives = [
    'const wrongComponent: WebRendererBank = { ...webRenderers, "control.date": SelectControl };',
    'const wrongLegacyComponent: WebRendererBank = { ...webRenderers, action: DateControl };',
    'const arbitraryComponent: WebRendererBank = { ...webRenderers, action: unrelated };',
    'const wrongEventBinding: WebRendererBank = { ...webRenderers, "control.date": wrongEmitter };',
    'const wrongNode: WebRendererProps["control.date"] = { node: choice, onevent: acceptAll };',
    'const wrongEvent: WebRendererProps["control.date"] = { node: date, onevent: acceptSelection };',
    'const incompleteInventory: WebRendererBank = { "control.date": DateControl };',
    'const inventedEntry: WebRendererBank = { ...webRenderers, rainbow: DateControl };',
    'const wrongInput: WebRendererProps["input.text"]["primitive"] = "input.multiline";',
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
      const completeInventory: WebRendererBank = webRenderers;
      const dateBinding: Component<WebRendererProps["control.date"]> = DateControl;
      const selectionBinding: Component<WebRendererProps["control.select"]> = SelectControl;
      const dateEvent: ControlEventFor<"date"> = { kind: "date.change", control: date.id, value: null };
    </script>
    <Date node={date} onevent={acceptAll} /><Select node={choice} onevent={acceptAll} />`);
    const checked = await project.run("check");
    assert.match(checked.stdout, /0 errors and 0 warnings/);
  } finally { project.close(); }
});
