import assert from "node:assert/strict";
import test from "node:test";
import { inspectVisualSource } from "../src/authoring/visual-boundary/inspect.ts";

const adapter = "src/svelte/FrameBody.svelte";
const composition = "src/svelte/pieces/DateCalendar.svelte";
const codes = (path: string, source: string) => inspectVisualSource(path, source).findings.map(item => item.code);

test("a renderer can select catalog pieces and emit typed events without drawing", () => {
  assert.deepEqual(codes(adapter, `<script lang="ts">import UtilityActions from './pieces/UtilityActions.svelte';
    let { actions, invoke } = $props();</script><UtilityActions {actions} {invoke} />`), []);
});

test("renderer markup, text, styles and runtime mutation are independent failures", () => {
  assert.ok(codes(adapter, `<div />`).includes("RENDERER_DOM"));
  assert.ok(codes(adapter, `Hello`).includes("RENDERER_TEXT"));
  assert.ok(codes(adapter, `<style>div { padding: 4px }</style>`).includes("RENDERER_CSS"));
  assert.ok(codes(adapter, `<script>element.style.setProperty('color', 'red')</script>`).includes("RENDERER_DOM_ACCESS"));
  assert.ok(codes(adapter, `<script>element['animate']([])</script>`).includes("RENDERER_DOM_ACCESS"));
});

test("catalog compositions cannot reopen a child through presentation inputs or snippets", () => {
  for (const input of ['class="p-0"', 'style="padding:0"', '{...props}', 'data-owner="other"', 'bind:this={ref}', 'use:replace']) {
    assert.ok(codes(composition, `<Toolbar ${input} />`).includes("OPEN_COMPONENT_INPUT"), input);
  }
  assert.ok(codes(composition, `<Toolbar>{#snippet controls()}<button />{/snippet}</Toolbar>`).includes("RENDER_SLOT"));
  assert.ok(codes(composition, `<script lang="ts">import type {HTMLAttributes} from 'svelte/elements';</script>`)
    .includes("OPEN_COMPONENT_CONTRACT"));
});

test("child overrides cannot hide in global selectors or HTML injection", () => {
  assert.ok(codes(composition, `<style>:global([data-date-calendar] .workspace-header) { padding: 0 }</style>`)
    .includes("GLOBAL_SELECTOR"));
  assert.ok(codes(composition, `{@html value}`).includes("RAW_HTML"));
  assert.deepEqual(codes(composition, `<div class="own-region"/><style>.own-region {display:grid}</style>`), []);
});

test("private vendor imports and dynamically selected modules fail the adapter boundary", () => {
  assert.ok(codes(adapter, `<script>import Button from './vendor/components/ui/button/button.svelte'</script>`)
    .includes("PRIVATE_VISUAL_IMPORT"));
  assert.ok(codes(adapter, `<script>const module = import(path)</script>`).includes("DYNAMIC_VISUAL_IMPORT"));
});
