import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { dirname, relative } from "node:path";
import { assertClosedVisualBoundaries } from "../src/authoring/visual-boundary/closed.ts";
import { inspectVisualSource } from "../src/authoring/visual-boundary/inspect.ts";

const compositions = "src/svelte/catalog/compositions";
const owners = ["toolbar-layout/ToolbarLayout", "toolbar-layout/ToolbarIdentity", "toolbar-search/ToolbarSearch", "toolbar-media-controls/ToolbarMediaControls"];
const consumer = `${compositions}/consumer/Consumer.svelte`;
const toolbarSpecifier = relative(dirname(consumer), `${compositions}/toolbar-layout/ToolbarLayout.svelte`);
test("toolbar composition owners expose finite data, never incoming rendering slots", async () => {
  for (const owner of owners) {
    const path = `${compositions}/${owner}.svelte`;
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.deepEqual(inspectVisualSource(path,source).findings, [], owner);
    assert.doesNotThrow(()=>assertClosedVisualBoundaries([{path,source}]),owner);
  }
});

test("toolbar consumers cannot replace children, identity markup, styles or native attributes", () => {
  const path=consumer;
  const imported=`<script>import Toolbar from '${toolbarSpecifier}';</script>`;
  for(const markup of [
    '<Toolbar children={foreign}/>', '<Toolbar leading={foreign}>{#snippet children()}<button>Foreign</button>{/snippet}</Toolbar>',
    '<Toolbar><button>Foreign</button></Toolbar>', '<Toolbar style="padding:0"/>', '<Toolbar class="custom"/>',
    '<Toolbar {...props}/>', '<Toolbar data-toolbar-title="foreign"/>', '<Toolbar bind:identityElement={element}/>',
  ]) assert.throws(()=>assertClosedVisualBoundaries([{path,source:imported+markup}]),/CLOSED_VISUAL_BOUNDARY|TOOLBAR_OWNERSHIP/);
  assert.doesNotThrow(()=>assertClosedVisualBoundaries([{path,source:imported+
    '<Toolbar identity={{title:"Notes"}} content={{kind:"actions",actions:[],onevent:()=>{}}}/>'}]));
});
