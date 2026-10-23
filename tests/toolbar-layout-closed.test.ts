import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assertClosedVisualBoundaries } from "../src/authoring/visual-boundary/closed.ts";
import { inspectVisualSource } from "../src/authoring/visual-boundary/inspect.ts";

const owners = ["ToolbarLayout", "ToolbarIdentity", "ToolbarSearch", "ToolbarMediaControls"];
test("toolbar composition owners expose finite data, never incoming rendering slots", async () => {
  for (const owner of owners) {
    const path = `src/svelte/pieces/${owner}.svelte`;
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.deepEqual(inspectVisualSource(path,source).findings, [], owner);
    assert.doesNotThrow(()=>assertClosedVisualBoundaries([{path,source}]),owner);
  }
});

test("toolbar consumers cannot replace children, identity markup, styles or native attributes", () => {
  const path="src/svelte/pieces/Consumer.svelte";
  const imported=`<script>import Toolbar from './ToolbarLayout.svelte';</script>`;
  for(const markup of [
    '<Toolbar children={foreign}/>', '<Toolbar leading={foreign}>{#snippet children()}<button>Foreign</button>{/snippet}</Toolbar>',
    '<Toolbar><button>Foreign</button></Toolbar>', '<Toolbar style="padding:0"/>', '<Toolbar class="custom"/>',
    '<Toolbar {...props}/>', '<Toolbar data-toolbar-title="foreign"/>', '<Toolbar bind:identityElement={element}/>',
  ]) assert.throws(()=>assertClosedVisualBoundaries([{path,source:imported+markup}]),/CLOSED_VISUAL_BOUNDARY|TOOLBAR_OWNERSHIP/);
  assert.doesNotThrow(()=>assertClosedVisualBoundaries([{path,source:imported+
    '<Toolbar identity={{title:"Notes"}} content={{kind:"actions",actions:[],onevent:()=>{}}}/>'}]));
});
