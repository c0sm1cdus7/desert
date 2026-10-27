import assert from "node:assert/strict";
import test from "node:test";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";

test("published label arrays use the existing Tag primitive in facts, not a JSON or CSV encoding", async () => {
  const f = await svelteBrowser(`<script lang="ts">
    import NodeRenderer from '@desert/svelte/catalog/renderer/node-renderer/NodeRenderer.svelte';
  </script>
  <NodeRenderer node={{version:'desert.bank-node/1',kind:'fact',details:{kind:'facts',
    object:'task',fields:['projects','status'],facts:{projects:['DESERT','Two words','🪴'],status:'open'},
    labels:{'task.projects':'Projects','task.status':'Status'},tags:['projects']}}} />`);
  try {
    assert.deepEqual(await f.page.locator('[data-tag] > span').allTextContents(), ['DESERT', 'Two words', '🪴']);
    assert.equal(await f.page.getByText('Projects', { exact: true }).count(), 1);
    assert.equal(await f.page.getByText('open', { exact: true }).count(), 1);
    assert.equal(await f.page.locator('[data-tag][data-tone="neutral"]').count(), 3);
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
