import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
// svelte-check of the generated project, not the gate: the test-only evidence project (plan 3.5) while the strict build is red.
import { createEvidenceProject } from "../src/testing/evidence-project.ts";

// The previous adapter gateway's typing, now through the catalog index: closed contracts type their pieces, and the
// node dispatcher's private inputs keep their own types (its contract is still a stub; rule E reports every caller).
test("catalog index pieces retain contract prop types and refuse native passthrough", { timeout: 60000 }, async () => {
  const project = createEvidenceProject("export const surface = {}; export const validateInput = () => false;");
  const page = join(project.directory, "src/routes/+page.svelte");
  const header = `<script lang="ts">
    import { TextContent, NodeRenderer, Feedback } from "@desert/svelte/catalog/index.ts";
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
      + '<NodeRenderer node={transient} frameIdentity={owner}/><NodeRenderer node={control} {host}/>');
    assert.match((await project.run("check")).stdout, /0 errors and 0 warnings/);
  } finally { project.close(); }
});
