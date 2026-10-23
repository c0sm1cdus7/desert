import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createBuildProject } from "../src/build/svelte/project.ts";

test("adapter gateway retains owner prop types and removes native passthrough", { timeout: 60000 }, async () => {
  const project = createBuildProject("export const surface = {}; export const validateInput = () => false;");
  const page = join(project.directory, "src/routes/+page.svelte");
  const header = `<script lang="ts">
    import { TextContent, BankRenderer, TransientRenderer, ControlBankRenderer, Feedback } from "@desert/svelte/adapter-catalog.ts";
    import type { BankNode, BankNodeFor } from "@desert/interaction/bank-node.ts";
    import type { ControlNode } from "@desert/interaction/control-nodes.ts";
    import type { LocalFileHost } from "@desert/svelte/controls/file-host.ts";
    let node!: BankNode;
    let transient!: BankNodeFor<"transient">;
    let control!: Extract<BankNode, {control:ControlNode}>;
    let host!: LocalFileHost;
    let owner!: object;
  </script>\n`;
  const invalid = ['<TextContent text={42}/>', '<TextContent text="Notes" class="padding-0"/>',
    '<BankRenderer {node} actionElementProps={{ style: "color:red" }}/>',
    '<BankRenderer {node} {host}/>', '<BankRenderer {node} frameIdentity={owner}/>',
    '<TransientRenderer node={control} frameIdentity={owner}/>', '<TransientRenderer node={transient}/>',
    '<TransientRenderer node={transient} frameIdentity={owner} {host}/>',
    '<ControlBankRenderer node={transient} {host}/>', '<ControlBankRenderer node={control}/>',
    '<ControlBankRenderer node={control} {host} frameIdentity={owner}/>',
    '<Feedback text={42}/>', '<Feedback text="Changed" class="large"/>', '<Feedback text="Changed" role="alert"/>'];
  try {
    const source = header + invalid.join("\n");
    writeFileSync(page, source);
    await assert.rejects(project.run("check"), error => {
      const lines = String(error).split("\n").filter(line => line.startsWith(`${page}:`))
        .map(line => Number(line.match(/:(\d+):\d+$/)?.[1]));
      assert.deepEqual([...new Set(lines)], invalid.map(line => source.split("\n").indexOf(line) + 1), String(error));
      return true;
    });
    writeFileSync(page, header + '<TextContent text="Notes"/><Feedback text="Changed"/>'
      + '<TransientRenderer node={transient} frameIdentity={owner}/><ControlBankRenderer node={control} {host}/>');
    assert.match((await project.run("check")).stdout, /0 errors and 0 warnings/);
  } finally { project.close(); }
});
