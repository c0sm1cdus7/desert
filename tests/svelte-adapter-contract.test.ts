import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createBuildProject } from "../src/build/svelte/project.ts";

test("adapter gateway retains owner prop types and removes native passthrough", { timeout: 60000 }, async () => {
  const project = createBuildProject("export const surface = {}; export const validateInput = () => false;");
  const page = join(project.directory, "src/routes/+page.svelte");
  const header = `<script lang="ts">
    import { TextContent, NodeRenderer, TransientRenderer, ControlNodeRenderer, Feedback } from "@desert/svelte/adapter-catalog.ts";
    import type { ResolvedNode, ResolvedNodeFor } from "@desert/interaction/resolved-node.ts";
    import type { ControlNode } from "@desert/interaction/control-nodes.ts";
    import type { LocalFileHost } from "@desert/svelte/infra/file-host.ts";
    let node!: ResolvedNode;
    let transient!: ResolvedNodeFor<"transient">;
    let control!: Extract<ResolvedNode, {control:ControlNode}>;
    let host!: LocalFileHost;
    let owner!: object;
  </script>\n`;
  const invalid = ['<TextContent text={42}/>', '<TextContent text="Notes" class="padding-0"/>',
    '<NodeRenderer {node} actionElementProps={{ style: "color:red" }}/>',
    '<NodeRenderer {node} {host}/>', '<NodeRenderer {node} frameIdentity={owner}/>',
    '<TransientRenderer node={control} frameIdentity={owner}/>', '<TransientRenderer node={transient}/>',
    '<TransientRenderer node={transient} frameIdentity={owner} {host}/>',
    '<ControlNodeRenderer node={transient} {host}/>', '<ControlNodeRenderer node={control}/>',
    '<ControlNodeRenderer node={control} {host} frameIdentity={owner}/>',
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
      + '<TransientRenderer node={transient} frameIdentity={owner}/><ControlNodeRenderer node={control} {host}/>');
    assert.match((await project.run("check")).stdout, /0 errors and 0 warnings/);
  } finally { project.close(); }
});
